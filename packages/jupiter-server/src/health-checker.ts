/**
 * Jupiter Server 健康检查器
 * 
 * 定期检查服务器健康状态并触发告警/重启
 */

import axios from 'axios';
import {
  JupiterServerConfig,
  HealthCheckResult,
  JupiterHealthResponse,
  ServerEventCallbacks,
} from './types';
import { logger } from '@solana-arb-bot/core';

const healthLogger = logger.child({ module: 'jupiter-server:health' });

/**
 * 健康检查器
 */
export class HealthChecker {
  private config: JupiterServerConfig;
  private callbacks: ServerEventCallbacks;
  private checkInterval?: NodeJS.Timeout;
  private consecutiveFailures: number = 0;
  private lastCheckResult?: HealthCheckResult;

  constructor(config: JupiterServerConfig, callbacks: ServerEventCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * 启动健康检查
   */
  start(): void {
    if (this.checkInterval) {
      healthLogger.warn('Health checker already running');
      return;
    }

    if (!this.config.health_check_enabled) {
      healthLogger.info('Health check disabled');
      return;
    }

    const interval = this.config.health_check_interval_ms || 10000;
    healthLogger.info(`Starting health checker (interval: ${interval}ms)`);

    // 立即执行一次
    this.performCheck();

    // 设置定时检查
    this.checkInterval = setInterval(() => {
      this.performCheck();
    }, interval);
  }

  /**
   * 停止健康检查
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      healthLogger.info('Health checker stopped');
    }
  }

  /**
   * 执行单次检查
   */
  async performCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const result = await this.checkEndpoints();
      const responseTime = Date.now() - startTime;

      result.responseTime = responseTime;
      result.timestamp = new Date();

      this.lastCheckResult = result;

      if (result.healthy) {
        // 检查成功
        this.consecutiveFailures = 0;
        healthLogger.debug(`✅ Health check passed (${responseTime}ms)`);

        if (this.callbacks.onHealthCheckSuccess) {
          this.callbacks.onHealthCheckSuccess(result);
        }
      } else {
        // 检查失败
        this.consecutiveFailures++;
        healthLogger.warn(`❌ Health check failed (attempt ${this.consecutiveFailures}): ${result.error}`);

        if (this.callbacks.onHealthCheckFailed) {
          this.callbacks.onHealthCheckFailed(result);
        }

        // 连续失败告警
        if (this.consecutiveFailures >= 3) {
          healthLogger.error(`🚨 Health check failed ${this.consecutiveFailures} times consecutively!`);
        }
      }

      return result;
    } catch (error: any) {
      this.consecutiveFailures++;
      
      const result: HealthCheckResult = {
        healthy: false,
        error: error.message,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        endpoints: {
          health: false,
        },
      };

      this.lastCheckResult = result;

      healthLogger.error(`Health check error: ${error.message}`);

      if (this.callbacks.onHealthCheckFailed) {
        this.callbacks.onHealthCheckFailed(result);
      }

      return result;
    }
  }

  /**
   * 检查各个端点
   */
  private async checkEndpoints(): Promise<HealthCheckResult> {
    const baseUrl = `http://${this.config.host || '127.0.0.1'}:${this.config.port || 8080}`;
    const timeout = this.config.health_check_timeout_ms || 5000;

    const result: HealthCheckResult = {
      healthy: false,
      timestamp: new Date(),
      endpoints: {
        health: false,
      },
    };

    try {
      // 1. 检查健康端点
      const healthEndpoint = this.config.health_check_endpoint || '/health';
      const healthUrl = `${baseUrl}${healthEndpoint}`;

      const healthResponse = await axios.get<JupiterHealthResponse>(healthUrl, {
        timeout,
        validateStatus: (status) => status === 200,
      });

      result.endpoints.health = healthResponse.data.status === 'ok';

      // 2. 检查quote端点（可选）
      try {
        const quoteUrl = `${baseUrl}/quote`;
        await axios.get(quoteUrl, {
          timeout: timeout / 2,
          params: {
            inputMint: 'So11111111111111111111111111111111111111112', // SOL
            outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
            amount: '1000000', // 0.001 SOL
          },
          validateStatus: (status) => status === 200 || status === 400,
        });
        result.endpoints.quote = true;
      } catch (quoteError) {
        result.endpoints.quote = false;
        healthLogger.debug('Quote endpoint check failed (non-critical)');
      }

      // 3. 检查swap端点（可选）
      // 注意：这会尝试获取swap交易但不会执行
      // 跳过此检查以避免不必要的RPC调用

      // 总体判断
      result.healthy = result.endpoints.health;

      if (!result.healthy) {
        result.error = 'Health endpoint check failed';
      }

      return result;
    } catch (error: any) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * 获取连续失败次数
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * 获取最后检查结果
   */
  getLastResult(): HealthCheckResult | undefined {
    return this.lastCheckResult;
  }

  /**
   * 重置失败计数
   */
  resetFailureCount(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * 是否健康
   */
  isHealthy(): boolean {
    return this.lastCheckResult?.healthy || false;
  }

  /**
   * 等待健康（用于启动后验证）
   */
  async waitUntilHealthy(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 1000; // 每秒检查一次

    healthLogger.info('Waiting for server to become healthy...');

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.performCheck();
      
      if (result.healthy) {
        healthLogger.info('✅ Server is healthy');
        return true;
      }

      // 等待下一次检查
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    healthLogger.error('❌ Timeout waiting for server to become healthy');
    return false;
  }

  /**
   * 获取健康统计
   */
  getStats(): {
    consecutiveFailures: number;
    lastCheck?: Date;
    lastHealthy: boolean;
    responseTime?: number;
  } {
    return {
      consecutiveFailures: this.consecutiveFailures,
      lastCheck: this.lastCheckResult?.timestamp,
      lastHealthy: this.lastCheckResult?.healthy || false,
      responseTime: this.lastCheckResult?.responseTime,
    };
  }
}
