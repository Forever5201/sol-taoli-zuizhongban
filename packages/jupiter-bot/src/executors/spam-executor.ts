/**
 * RPC Spam执行器
 * 
 * 通过向多个RPC节点并行发送交易来提高成功率
 * 设计文档：路径B - RPC高频轰炸
 */

import { Connection, VersionedTransaction, TransactionSignature } from '@solana/web3.js';
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('SpamExecutor');

/**
 * Spam配置
 */
export interface SpamConfig {
  /** RPC端点列表 */
  rpcEndpoints: string[];
  /** 每个端点发送次数 */
  sendPerEndpoint?: number;
  /** 跳过预检 */
  skipPreflight?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 确认超时（秒） */
  confirmationTimeout?: number;
}

/**
 * 执行结果
 */
export interface SpamResult {
  success: boolean;
  signature?: TransactionSignature;
  confirmedSlot?: number;
  attempts: number;
  successfulSends: number;
  errors: string[];
  latencyMs: number;
}

/**
 * RPC Spam执行器
 */
export class SpamExecutor {
  private connections: Connection[] = [];
  private config: Required<SpamConfig>;

  constructor(config: SpamConfig) {
    this.config = {
      sendPerEndpoint: config.sendPerEndpoint || 3,
      skipPreflight: config.skipPreflight !== false,
      maxRetries: config.maxRetries || 0,
      confirmationTimeout: config.confirmationTimeout || 30,
      ...config,
    };

    // 初始化所有RPC连接
    for (const endpoint of config.rpcEndpoints) {
      this.connections.push(
        new Connection(endpoint, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: this.config.confirmationTimeout * 1000,
        })
      );
    }

    logger.info(
      `Spam Executor initialized with ${this.connections.length} RPCs, ` +
      `${this.config.sendPerEndpoint} sends per endpoint`
    );
  }

  /**
   * 执行交易
   */
  async execute(transaction: VersionedTransaction): Promise<SpamResult> {
    const startTime = Date.now();
    const result: SpamResult = {
      success: false,
      attempts: 0,
      successfulSends: 0,
      errors: [],
      latencyMs: 0,
    };

    try {
      // 并行发送到所有RPC
      const sendPromises: Promise<string>[] = [];

      for (let i = 0; i < this.connections.length; i++) {
        const connection = this.connections[i];
        
        // 每个RPC发送多次
        for (let j = 0; j < this.config.sendPerEndpoint; j++) {
          sendPromises.push(
            this.sendTransaction(connection, transaction, i)
          );
        }
      }

      result.attempts = sendPromises.length;

      // 等待第一个成功的签名
      const signature = await Promise.race(
        sendPromises.map(async (promise, index) => {
          try {
            const sig = await promise;
            result.successfulSends++;
            logger.debug(`Send ${index + 1}/${sendPromises.length} succeeded: ${sig}`);
            return sig;
          } catch (error: any) {
            result.errors.push(`Send ${index + 1} failed: ${error.message}`);
            throw error;
          }
        })
      );

      result.signature = signature;
      logger.info(`Transaction sent successfully: ${signature}`);

      // 等待确认
      const confirmation = await this.waitForConfirmation(signature);

      if (confirmation) {
        result.success = true;
        result.confirmedSlot = confirmation.slot;
        logger.info(
          `Transaction confirmed at slot ${confirmation.slot}, ` +
          `${result.successfulSends}/${result.attempts} sends succeeded`
        );
      } else {
        result.success = false;
        logger.warn(`Transaction not confirmed within timeout: ${signature}`);
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Execution failed: ${error.message}`);
      logger.error(`Spam execution failed: ${error.message}`);
    }

    result.latencyMs = Date.now() - startTime;
    return result;
  }

  /**
   * 发送单个交易到RPC
   */
  private async sendTransaction(
    connection: Connection,
    transaction: VersionedTransaction,
    rpcIndex: number
  ): Promise<string> {
    try {
      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: this.config.skipPreflight,
        maxRetries: this.config.maxRetries,
      });

      return signature;
    } catch (error: any) {
      logger.debug(`RPC ${rpcIndex} send failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 等待交易确认
   */
  private async waitForConfirmation(
    signature: TransactionSignature
  ): Promise<{ slot: number } | null> {
    const startTime = Date.now();
    const timeout = this.config.confirmationTimeout * 1000;

    // 使用第一个RPC等待确认
    const connection = this.connections[0];

    while (Date.now() - startTime < timeout) {
      try {
        const status = await connection.getSignatureStatus(signature);

        if (status?.value?.confirmationStatus === 'confirmed' || 
            status?.value?.confirmationStatus === 'finalized') {
          return { slot: status.value.slot };
        }

        if (status?.value?.err) {
          logger.error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          return null;
        }

        // 等待100ms后再次检查
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        logger.warn(`Status check error: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * 获取统计信息
   */
  getRpcCount(): number {
    return this.connections.length;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ endpoint: string; healthy: boolean; latencyMs: number }[]> {
    const results = await Promise.all(
      this.connections.map(async (connection, index) => {
        const startTime = Date.now();
        try {
          await connection.getSlot();
          return {
            endpoint: this.config.rpcEndpoints[index],
            healthy: true,
            latencyMs: Date.now() - startTime,
          };
        } catch (error) {
          return {
            endpoint: this.config.rpcEndpoints[index],
            healthy: false,
            latencyMs: -1,
          };
        }
      })
    );

    return results;
  }
}
