/**
 * Jupiter Server 进程管理器
 * 
 * 负责启动、停止、重启Jupiter CLI进程
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import {
  JupiterServerConfig,
  ServerStatus,
  ProcessInfo,
  ServerInfo,
  JupiterServerError,
  ErrorType,
  ServerEventCallbacks,
} from './types';
import { logger } from '@solana-arb-bot/core';

const processLogger = logger.child({ module: 'jupiter-server:process' });

/**
 * 进程管理器
 */
export class ProcessManager {
  private processInfo: ProcessInfo = {};
  private config: JupiterServerConfig;
  private status: ServerStatus = ServerStatus.STOPPED;
  private startTime?: Date;
  private restartCount: number = 0;
  private lastError?: string;
  private callbacks: ServerEventCallbacks;

  constructor(config: JupiterServerConfig, callbacks: ServerEventCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * 启动进程
   */
  async start(binaryPath: string): Promise<void> {
    if (this.status !== ServerStatus.STOPPED) {
      throw new JupiterServerError(
        ErrorType.START_FAILED,
        `Cannot start: current status is ${this.status}`
      );
    }

    try {
      this.status = ServerStatus.STARTING;
      processLogger.info('===== Starting Jupiter Server =====');
      processLogger.info(`Binary: ${binaryPath}`);
      processLogger.info(`Port: ${this.config.port}`);
      processLogger.info(`RPC: ${this.config.rpc_url}`);

      // 构建环境变量
      const env = this.buildEnv();

      // 构建命令参数
      const args = this.buildArgs();

      processLogger.debug(`Environment variables: ${JSON.stringify(env, null, 2)}`);
      processLogger.debug(`Arguments: ${args.join(' ')}`);

      // 启动子进程
      const childProcess = spawn(binaryPath, args, {
        env,
        stdio: ['ignore', 'pipe', 'pipe'], // stdin忽略, stdout和stderr捕获
        detached: false,
        cwd: path.dirname(binaryPath),
      });

      // 保存进程信息
      this.processInfo = {
        process: childProcess,
        pid: childProcess.pid,
        startTime: new Date(),
      };

      this.startTime = new Date();

      // 监听stdout
      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data: Buffer) => {
          const message = data.toString().trim();
          if (message) {
            processLogger.info(`[STDOUT] ${message}`);
          }
        });
      }

      // 监听stderr
      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data: Buffer) => {
          const message = data.toString().trim();
          if (message) {
            processLogger.warn(`[STDERR] ${message}`);
          }
        });
      }

      // 监听进程退出
      childProcess.on('exit', (code, signal) => {
        processLogger.warn(`Process exited: code=${code}, signal=${signal}`);
        this.processInfo.exitCode = code || undefined;
        this.processInfo.signal = signal || undefined;
        this.handleProcessExit(code, signal);
      });

      // 监听错误
      childProcess.on('error', (error) => {
        processLogger.error(`Process error: ${error.message}`);
        this.lastError = error.message;
        
        if (this.callbacks.onError) {
          this.callbacks.onError(error);
        }
      });

      // 等待启动
      await this.waitForStartup();

      this.status = ServerStatus.RUNNING;
      processLogger.info('✅ Jupiter Server started successfully');
      processLogger.info(`PID: ${childProcess.pid}`);

      if (this.callbacks.onStart) {
        this.callbacks.onStart();
      }
    } catch (error: any) {
      this.status = ServerStatus.ERROR;
      this.lastError = error.message;
      processLogger.error(`Failed to start: ${error.message}`);

      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }

      throw new JupiterServerError(
        ErrorType.START_FAILED,
        'Failed to start Jupiter Server',
        error
      );
    }
  }

  /**
   * 停止进程
   */
  async stop(): Promise<void> {
    if (this.status === ServerStatus.STOPPED) {
      processLogger.warn('Server already stopped');
      return;
    }

    try {
      this.status = ServerStatus.STOPPING;
      processLogger.info('Stopping Jupiter Server...');

      const { process } = this.processInfo;

      if (!process || !process.pid) {
        processLogger.warn('No process to stop');
        this.status = ServerStatus.STOPPED;
        return;
      }

      // 发送SIGTERM信号
      process.kill('SIGTERM');

      // 等待进程退出（最多10秒）
      const timeout = 10000;
      const startTime = Date.now();

      while (process.killed === false && Date.now() - startTime < timeout) {
        await this.sleep(100);
      }

      // 如果还没退出，强制杀死
      if (process.killed === false) {
        processLogger.warn('Process did not exit gracefully, force killing');
        process.kill('SIGKILL');
        await this.sleep(1000);
      }

      this.status = ServerStatus.STOPPED;
      this.processInfo = {};
      this.startTime = undefined;

      processLogger.info('✅ Jupiter Server stopped');

      if (this.callbacks.onStop) {
        this.callbacks.onStop();
      }
    } catch (error: any) {
      processLogger.error(`Failed to stop: ${error.message}`);
      throw error;
    }
  }

  /**
   * 重启进程
   */
  async restart(binaryPath: string): Promise<void> {
    this.status = ServerStatus.RESTARTING;
    this.restartCount++;

    processLogger.info(`Restarting Jupiter Server (attempt ${this.restartCount})...`);

    try {
      // 先停止（如果正在运行）
      // 注意：此时 status 已经是 RESTARTING，但我们仍需要停止底层进程
      if ((this.status as any) !== ServerStatus.STOPPED) {
        await this.stop();
      }

      // 等待重启延迟
      if (this.config.restart_delay_ms && this.config.restart_delay_ms > 0) {
        processLogger.info(`Waiting ${this.config.restart_delay_ms}ms before restart...`);
        await this.sleep(this.config.restart_delay_ms);
      }

      // 重新启动
      await this.start(binaryPath);

      if (this.callbacks.onRestart) {
        this.callbacks.onRestart(this.restartCount);
      }
    } catch (error: any) {
      processLogger.error(`Restart failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取服务器信息
   */
  getInfo(): ServerInfo {
    const uptime = this.startTime 
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : undefined;

    return {
      status: this.status,
      pid: this.processInfo.pid,
      port: this.config.port || 8080,
      uptime,
      restartCount: this.restartCount,
      lastError: this.lastError,
      healthy: this.status === ServerStatus.RUNNING,
    };
  }

  /**
   * 获取当前状态
   */
  getStatus(): ServerStatus {
    return this.status;
  }

  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return this.status === ServerStatus.RUNNING;
  }

  /**
   * 构建环境变量
   */
  private buildEnv(): Record<string, string> {
    const env: Record<string, string> = {
      ...process.env,
      ...this.config.env,
      
      // Jupiter必需环境变量
      RPC_URL: this.config.rpc_url,
      PORT: String(this.config.port || 8080),
      HOST: this.config.host || '127.0.0.1',
    };

    // 启用环形套利
    if (this.config.allow_circular_arbitrage !== false) {
      env.ALLOW_CIRCULAR_ARBITRAGE = 'true';
    }

    // Worker线程数
    if (this.config.worker_threads) {
      env.WORKER_THREADS = String(this.config.worker_threads);
    }

    // 缓存大小
    if (this.config.cache_size) {
      env.CACHE_SIZE = String(this.config.cache_size);
    }

    // 日志级别
    if (this.config.log_level) {
      env.RUST_LOG = this.config.log_level;
    }

    return env;
  }

  /**
   * 构建命令参数
   */
  private buildArgs(): string[] {
    const args: string[] = [];

    // 添加其他参数（根据Jupiter CLI实际支持的参数）
    // 注意：大部分配置通过环境变量传递

    return args;
  }

  /**
   * 等待启动完成
   */
  private async waitForStartup(): Promise<void> {
    const timeout = 30000; // 30秒超时
    const checkInterval = 500; // 每500ms检查一次
    const startTime = Date.now();

    processLogger.info('Waiting for server to be ready...');

    while (Date.now() - startTime < timeout) {
      // 检查进程是否还活着
      const { process } = this.processInfo;
      if (!process || process.killed) {
        throw new Error('Process died during startup');
      }

      // 检查是否可以连接（这里可以添加HTTP检查）
      // 暂时简单等待5秒
      if (Date.now() - startTime > 5000) {
        processLogger.info('Startup wait complete');
        return;
      }

      await this.sleep(checkInterval);
    }

    throw new Error('Startup timeout');
  }

  /**
   * 处理进程退出
   */
  private handleProcessExit(code: number | null, signal: string | null): void {
    this.status = ServerStatus.STOPPED;

    // 非正常退出
    if (code !== 0 && code !== null) {
      processLogger.error(`Process crashed with exit code ${code}`);
      this.lastError = `Process exited with code ${code}`;

      // 自动重启
      if (this.config.auto_restart && 
          this.restartCount < (this.config.max_restart_attempts || 3)) {
        processLogger.warn(`Will attempt auto-restart (${this.restartCount + 1}/${this.config.max_restart_attempts})`);
        
        if (this.callbacks.onError) {
          this.callbacks.onError(
            new JupiterServerError(
              ErrorType.PROCESS_CRASHED,
              `Process crashed with code ${code}`
            )
          );
        }
      } else {
        processLogger.error('Max restart attempts reached or auto-restart disabled');
      }
    }
  }

  /**
   * 工具函数：睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重置重启计数
   */
  resetRestartCount(): void {
    this.restartCount = 0;
  }
}
