/**
 * RPC Spam 执行器
 * 
 * 并发发送交易到多个RPC节点，提高交易成功率
 */

import { Transaction, Keypair, SendOptions, TransactionSignature, VersionedTransaction } from '@solana/web3.js';
import { ConnectionPool, BroadcastResult } from '../../../core/src/solana/connection';
import { TransactionBuilder } from '../../../core/src/solana/transaction';
import { TransactionResult } from '../../../core/src/economics/types';
import { createLogger } from '../../../core/src/logger';

const logger = createLogger('SpamExecutor');

/**
 * 执行配置
 */
export interface SpamExecutorConfig {
  /** 是否跳过预检 */
  skipPreflight?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 确认超时（ms） */
  confirmationTimeout?: number;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 交易签名 */
  signature?: TransactionSignature;
  /** 成功的RPC端点 */
  successfulEndpoint?: string;
  /** 总尝试次数 */
  totalAttempts: number;
  /** 成功的RPC数量 */
  successfulRPCs: number;
  /** 总延迟（ms） */
  latency: number;
  /** 错误信息 */
  error?: string;
}

/**
 * Spam执行器类
 */
export class SpamExecutor {
  private connectionPool: ConnectionPool;
  private config: Required<SpamExecutorConfig>;

  constructor(connectionPool: ConnectionPool, config: SpamExecutorConfig = {}) {
    this.connectionPool = connectionPool;
    this.config = {
      skipPreflight: config.skipPreflight !== false,
      maxRetries: config.maxRetries || 3,
      confirmationTimeout: config.confirmationTimeout || 30000, // 30 seconds
    };

    logger.info(`Spam executor initialized with ${config.maxRetries || 3} max retries`);
  }

  /**
   * 执行交易
   * @param transaction 交易对象
   * @param signers 签名者列表
   * @returns 执行结果
   */
  async execute(transaction: Transaction, signers: Keypair[]): Promise<ExecutionResult> {
    const startTime = Date.now();
    let attempt = 0;

    logger.info(`Executing transaction with ${signers.length} signer(s)`);

    while (attempt < this.config.maxRetries) {
      attempt++;

      try {
        // 1. 签名交易
        TransactionBuilder.signTransaction(transaction, signers);

        // 2. 验证交易
        if (!TransactionBuilder.validateTransaction(transaction)) {
          throw new Error('Transaction validation failed');
        }

        // 3. 并发广播到所有RPC
        const sendOptions: SendOptions = {
          skipPreflight: this.config.skipPreflight,
          maxRetries: 0, // 我们自己控制重试
        };

        logger.debug(`Broadcasting transaction (attempt ${attempt}/${this.config.maxRetries})...`);
        const results = await this.connectionPool.broadcastTransaction(transaction, sendOptions);

        // 4. 分析结果
        const successfulResults = results.filter((r) => r.success);
        
        if (successfulResults.length > 0) {
          // 至少有一个RPC成功
          const bestResult = successfulResults.reduce((best, current) =>
            current.latency < best.latency ? current : best
          );

          const totalLatency = Date.now() - startTime;
          
          logger.info(
            `Transaction successful! Signature: ${bestResult.signature}, ` +
            `RPCs: ${successfulResults.length}/${results.length}, ` +
            `Latency: ${totalLatency}ms`
          );

          return {
            success: true,
            signature: bestResult.signature!,
            successfulEndpoint: bestResult.endpoint,
            totalAttempts: attempt,
            successfulRPCs: successfulResults.length,
            latency: totalLatency,
          };
        }

        // 所有RPC都失败了
        logger.warn(`All RPCs failed on attempt ${attempt}`);
        
        if (attempt >= this.config.maxRetries) {
          // 达到最大重试次数
          const errors = results.map((r) => r.error?.message || 'Unknown error').join('; ');
          
          return {
            success: false,
            totalAttempts: attempt,
            successfulRPCs: 0,
            latency: Date.now() - startTime,
            error: `All attempts failed: ${errors}`,
          };
        }

        // 等待一段时间后重试
        await this.sleep(1000 * attempt);
        
      } catch (error) {
        logger.error(`Execution error on attempt ${attempt}: ${error}`);
        
        if (attempt >= this.config.maxRetries) {
          return {
            success: false,
            totalAttempts: attempt,
            successfulRPCs: 0,
            latency: Date.now() - startTime,
            error: String(error),
          };
        }

        await this.sleep(1000 * attempt);
      }
    }

    // 不应该到达这里
    return {
      success: false,
      totalAttempts: attempt,
      successfulRPCs: 0,
      latency: Date.now() - startTime,
      error: 'Max retries exceeded',
    };
  }

  /**
   * 执行VersionedTransaction（用于Jupiter Swap）
   * @param versionedTx 版本化交易
   * @param expectedProfit 预期利润
   * @returns TransactionResult对象
   */
  async executeVersionedTransaction(
    versionedTx: VersionedTransaction,
    expectedProfit?: number
  ): Promise<TransactionResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Executing VersionedTransaction via RPC Spam...');
      
      // 直接使用最佳连接发送（简化版本）
      const connection = this.connectionPool.getBestConnection();
      
      const sendOptions: SendOptions = {
        skipPreflight: this.config.skipPreflight,
        maxRetries: this.config.maxRetries,
      };
      
      const signature = await connection.sendTransaction(versionedTx, sendOptions);
      
      logger.info(
        `✅ VersionedTransaction sent successfully | ` +
        `Signature: ${signature} | ` +
        `Latency: ${Date.now() - startTime}ms`
      );
      
      // 等待确认
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        logger.error(`Transaction failed: ${confirmation.value.err}`);
        return {
          success: false,
          cost: 50_000,
          timestamp: Date.now(),
          error: String(confirmation.value.err),
        };
      }
      
      return {
        success: true,
        signature,
        profit: expectedProfit,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(`VersionedTransaction execution failed: ${error}`);
      
      return {
        success: false,
        cost: 50_000,
        timestamp: Date.now(),
        error: String(error),
      };
    }
  }

  /**
   * 执行交易并转换为TransactionResult格式
   * @param transaction 交易对象
   * @param signers 签名者列表
   * @param expectedProfit 预期利润（可选）
   * @returns TransactionResult对象
   */
  async executeAndConvert(
    transaction: Transaction,
    signers: Keypair[],
    expectedProfit?: number
  ): Promise<TransactionResult> {
    const result = await this.execute(transaction, signers);

    return {
      success: result.success,
      profit: result.success ? expectedProfit : undefined,
      cost: result.success ? undefined : 50_000, // 估算的失败成本
      signature: result.signature,
      timestamp: Date.now(),
      error: result.error,
    };
  }

  /**
   * 确认交易
   * @param signature 交易签名
   * @returns 是否确认成功
   */
  async confirmTransaction(signature: TransactionSignature): Promise<boolean> {
    try {
      const connection = this.connectionPool.getBestConnection();
      
      logger.debug(`Confirming transaction ${signature}...`);
      
      const confirmation = await connection.confirmTransaction(
        signature,
        'confirmed'
      );

      if (confirmation.value.err) {
        logger.error(`Transaction ${signature} failed: ${confirmation.value.err}`);
        return false;
      }

      logger.info(`Transaction ${signature} confirmed`);
      return true;
    } catch (error) {
      logger.error(`Failed to confirm transaction: ${error}`);
      return false;
    }
  }

  /**
   * 执行并确认交易
   * @param transaction 交易对象
   * @param signers 签名者列表
   * @returns 执行结果
   */
  async executeAndConfirm(
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<ExecutionResult> {
    const result = await this.execute(transaction, signers);

    if (!result.success || !result.signature) {
      return result;
    }

    // 等待确认
    const confirmed = await this.confirmTransaction(result.signature);

    if (!confirmed) {
      return {
        ...result,
        success: false,
        error: 'Transaction sent but failed to confirm',
      };
    }

    return result;
  }

  /**
   * 获取执行统计
   * @returns 统计信息
   */
  getStats(): {
    healthyRPCs: number;
    totalRPCs: number;
  } {
    const healthStatus = this.connectionPool.getHealthStatus();
    const healthyRPCs = healthStatus.filter((s) => s.isHealthy).length;

    return {
      healthyRPCs,
      totalRPCs: healthStatus.length,
    };
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<SpamExecutorConfig>): void {
    Object.assign(this.config, newConfig);
    logger.info('Spam executor config updated');
  }

  /**
   * Sleep 辅助函数
   * @param ms 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default SpamExecutor;


