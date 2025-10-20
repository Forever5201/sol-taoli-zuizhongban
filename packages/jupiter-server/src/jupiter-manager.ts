/**
 * Jupiter Server Manager
 * 
 * 负责管理自托管的 Jupiter API Server
 * - 自动下载 jupiter-cli 二进制文件
 * - 启动/停止/重启进程
 * - 健康检查和监控
 * - 自动故障恢复
 */

import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('JupiterManager');

export interface JupiterServerConfig {
  /** RPC URL */
  rpcUrl: string;
  /** 服务端口 */
  port: number;
  /** Jupiter CLI 版本 */
  version?: string;
  /** 二进制文件路径 */
  binaryPath?: string;
  /** 是否启用环形套利 */
  enableCircularArbitrage?: boolean;
  /** 最大路由数 */
  maxRoutes?: number;
  /** 只使用直接路由 */
  onlyDirectRoutes?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

export interface JupiterServerStatus {
  /** 是否运行中 */
  running: boolean;
  /** 服务端口 */
  port: number;
  /** 启动时间戳 */
  startTime?: number;
  /** 运行时长（毫秒） */
  uptime?: number;
  /** 重启次数 */
  restartCount: number;
  /** 最后一次健康检查 */
  lastHealthCheck?: Date;
  /** 健康状态 */
  healthy?: boolean;
}

export class JupiterServerManager {
  private config: Required<JupiterServerConfig>;
  private process: ChildProcess | null = null;
  private isRunning = false;
  private startTime?: number;
  private restartAttempts = 0;
  private readonly MAX_RESTART_ATTEMPTS = 5;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: JupiterServerConfig) {
    this.config = {
      rpcUrl: config.rpcUrl,
      port: config.port || 8080,
      version: config.version || 'v6.0.35',
      binaryPath: config.binaryPath || './bin/jupiter-cli',
      enableCircularArbitrage: config.enableCircularArbitrage !== false,
      maxRoutes: config.maxRoutes || 3,
      onlyDirectRoutes: config.onlyDirectRoutes || false,
      timeout: config.timeout || 30000,
    };

    logger.info('Jupiter Server Manager initialized', {
      port: this.config.port,
      version: this.config.version,
      circularArbitrage: this.config.enableCircularArbitrage,
    });
  }

  /**
   * 确保 Jupiter CLI 存在（如果不存在则下载）
   */
  async ensureJupiterCli(): Promise<void> {
    const binaryPath = this.config.binaryPath;
    
    if (fs.existsSync(binaryPath)) {
      logger.info(`Jupiter CLI already exists at ${binaryPath}`);
      return;
    }

    logger.info(`Downloading Jupiter CLI ${this.config.version}...`);

    const platform = process.platform;
    let downloadUrl: string;
    let binaryName: string;

    switch (platform) {
      case 'linux':
        downloadUrl = `https://github.com/jup-ag/jupiter-quote-api-node/releases/download/${this.config.version}/jupiter-cli-linux`;
        binaryName = 'jupiter-cli';
        break;
      case 'darwin':
        downloadUrl = `https://github.com/jup-ag/jupiter-quote-api-node/releases/download/${this.config.version}/jupiter-cli-macos`;
        binaryName = 'jupiter-cli';
        break;
      case 'win32':
        downloadUrl = `https://github.com/jup-ag/jupiter-quote-api-node/releases/download/${this.config.version}/jupiter-cli-windows.exe`;
        binaryName = 'jupiter-cli.exe';
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    try {
      logger.info(`Downloading from: ${downloadUrl}`);
      
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2 分钟超时
        maxContentLength: 100 * 1024 * 1024, // 100MB
      });

      // 确保目录存在
      const dir = path.dirname(binaryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }

      // 写入文件
      fs.writeFileSync(binaryPath, Buffer.from(response.data));
      logger.info(`Binary written to: ${binaryPath}`);

      // 添加执行权限 (Linux/Mac)
      if (platform !== 'win32') {
        fs.chmodSync(binaryPath, 0o755);
        logger.info('Execute permission granted');
      }

      logger.info(`✅ Jupiter CLI downloaded successfully (${(response.data.byteLength / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error: any) {
      logger.error(`Failed to download Jupiter CLI: ${error.message}`, {
        url: downloadUrl,
        error: error.toString(),
      });
      throw error;
    }
  }

  /**
   * 启动 Jupiter Server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Jupiter Server already running');
      return;
    }

    // 确保二进制文件存在
    await this.ensureJupiterCli();

    logger.info('Starting Jupiter Server...', {
      port: this.config.port,
      rpc: this.config.rpcUrl.substring(0, 50) + '...',
    });

    const env = {
      ...process.env,
      RPC_URL: this.config.rpcUrl,
      PORT: this.config.port.toString(),
      ALLOW_CIRCULAR_ARBITRAGE: this.config.enableCircularArbitrage.toString(),
      MAX_ROUTES: this.config.maxRoutes.toString(),
      ONLY_DIRECT_ROUTES: this.config.onlyDirectRoutes.toString(),
    };

    this.process = spawn(this.config.binaryPath, [], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.isRunning = true;
    this.startTime = Date.now();
    this.restartAttempts = 0;

    // 监听标准输出
    this.process.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        logger.debug(`Jupiter: ${output}`);
      }
    });

    // 监听标准错误
    this.process.stderr?.on('data', (data) => {
      const error = data.toString().trim();
      if (error && !error.includes('INFO')) {
        logger.error(`Jupiter Error: ${error}`);
      } else {
        logger.debug(`Jupiter: ${error}`);
      }
    });

    // 监听进程退出
    this.process.on('exit', (code, signal) => {
      logger.warn(`Jupiter Server exited`, {
        code,
        signal,
        uptime: this.startTime ? Date.now() - this.startTime : 0,
      });
      
      this.isRunning = false;
      this.process = null;

      // 自动重启（如果不是主动停止）
      if (this.restartAttempts < this.MAX_RESTART_ATTEMPTS) {
        this.restartAttempts++;
        logger.info(`Attempting to restart (${this.restartAttempts}/${this.MAX_RESTART_ATTEMPTS})...`);
        setTimeout(() => this.start(), 5000);
      } else {
        logger.error(`Max restart attempts (${this.MAX_RESTART_ATTEMPTS}) reached, giving up`);
      }
    });

    // 监听错误
    this.process.on('error', (error) => {
      logger.error(`Jupiter Server process error: ${error.message}`, {
        error: error.toString(),
      });
    });

    // 等待服务启动
    try {
      await this.waitForReady();
      logger.info(`✅ Jupiter Server started successfully at http://127.0.0.1:${this.config.port}`);
      
      // 启动定期健康检查
      this.startHealthCheck();
    } catch (error: any) {
      logger.error(`Failed to start Jupiter Server: ${error.message}`);
      await this.stop();
      throw error;
    }
  }

  /**
   * 等待服务就绪
   */
  private async waitForReady(maxAttempts = 30): Promise<void> {
    logger.info('Waiting for Jupiter Server to be ready...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(
          `http://127.0.0.1:${this.config.port}/health`,
          { timeout: 2000 }
        );

        if (response.status === 200) {
          logger.info(`Jupiter Server is ready (attempt ${i + 1}/${maxAttempts})`);
          return;
        }
      } catch (error) {
        // 继续等待
        logger.debug(`Health check failed (attempt ${i + 1}/${maxAttempts})`);
      }

      await this.sleep(1000);
    }

    throw new Error(`Jupiter Server failed to start within ${maxAttempts} seconds`);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(
        `http://127.0.0.1:${this.config.port}/health`,
        { timeout: 3000 }
      );
      
      const healthy = response.status === 200;
      logger.debug(`Health check: ${healthy ? '✅ OK' : '❌ Failed'}`);
      return healthy;
    } catch (error) {
      logger.warn('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 启动定期健康检查
   */
  private startHealthCheck(): void {
    // 清除旧的定时器
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // 每30秒检查一次
    this.healthCheckInterval = setInterval(async () => {
      const healthy = await this.healthCheck();
      if (!healthy && this.isRunning) {
        logger.warn('Health check failed, server may be down');
      }
    }, 30000);
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.process) {
      logger.info('Jupiter Server is not running');
      return;
    }

    logger.info('Stopping Jupiter Server...');
    
    // 停止健康检查
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.isRunning = false;
    this.restartAttempts = this.MAX_RESTART_ATTEMPTS; // 防止自动重启

    // 尝试优雅关闭
    this.process.kill('SIGTERM');

    // 等待优雅退出
    await this.sleep(2000);

    // 如果还在运行，强制杀死
    if (this.process && !this.process.killed) {
      logger.warn('Force killing Jupiter Server');
      this.process.kill('SIGKILL');
    }

    this.process = null;
    this.startTime = undefined;
    logger.info('✅ Jupiter Server stopped');
  }

  /**
   * 重启服务
   */
  async restart(): Promise<void> {
    logger.info('Restarting Jupiter Server...');
    await this.stop();
    await this.sleep(1000);
    await this.start();
  }

  /**
   * 获取服务状态
   */
  getStatus(): JupiterServerStatus {
    return {
      running: this.isRunning,
      port: this.config.port,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : undefined,
      restartCount: this.restartAttempts,
    };
  }

  /**
   * 测试查询（用于验证功能）
   */
  async testQuery(inputMint: string, outputMint: string, amount: number): Promise<any> {
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: '50',
      });

      const response = await axios.get(
        `http://127.0.0.1:${this.config.port}/quote?${params}`,
        { timeout: 10000 }
      );

      logger.info('Test query successful', {
        inputMint: inputMint.substring(0, 8) + '...',
        outputMint: outputMint.substring(0, 8) + '...',
        amount,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Test query failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 休眠辅助函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

