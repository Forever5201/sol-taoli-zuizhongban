/**
 * Jupiter Server Manager - 主入口
 * 
 * 自动化管理本地Jupiter v6 API实例
 */

import * as path from 'path';
import { ConfigManager } from './config';
import { JupiterDownloader } from './downloader';
import { ProcessManager } from './process-manager';
import { HealthChecker } from './health-checker';
import {
  JupiterServerConfig,
  ServerStatus,
  ServerInfo,
  HealthCheckResult,
  ServerEventCallbacks,
  JupiterServerError,
  ErrorType,
} from './types';
import { logger } from '@solana-arb-bot/core';

const serverLogger = logger.child({ module: 'jupiter-server' });

/**
 * Jupiter Server Manager
 * 
 * 统一管理Jupiter API服务器的完整生命周期
 */
export class JupiterServerManager {
  private config: JupiterServerConfig;
  private processManager: ProcessManager;
  private healthChecker: HealthChecker;
  private binaryPath?: string;
  private callbacks: ServerEventCallbacks;

  constructor(config: JupiterServerConfig, callbacks: ServerEventCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;

    // 初始化组件
    this.processManager = new ProcessManager(config, {
      onStart: () => {
        serverLogger.info('🚀 Server started event');
        if (callbacks.onStart) callbacks.onStart();
      },
      onStop: () => {
        serverLogger.info('🛑 Server stopped event');
        if (callbacks.onStop) callbacks.onStop();
      },
      onRestart: (count) => {
        serverLogger.warn(`🔄 Server restarted (count: ${count})`);
        if (callbacks.onRestart) callbacks.onRestart(count);
      },
      onError: (error) => {
        serverLogger.error(`❌ Server error: ${error.message}`);
        if (callbacks.onError) callbacks.onError(error);
      },
    });

    this.healthChecker = new HealthChecker(config, {
      onHealthCheckSuccess: (result) => {
        if (callbacks.onHealthCheckSuccess) {
          callbacks.onHealthCheckSuccess(result);
        }
      },
      onHealthCheckFailed: (result) => {
        serverLogger.warn(`Health check failed: ${result.error}`);
        
        // 达到阈值后自动重启
        const consecutiveFailures = this.healthChecker.getConsecutiveFailures();
        if (consecutiveFailures >= 5 && config.auto_restart) {
          serverLogger.error('Too many health check failures, restarting server...');
          this.restart().catch(err => {
            serverLogger.error(`Auto-restart failed: ${err.message}`);
          });
        }

        if (callbacks.onHealthCheckFailed) {
          callbacks.onHealthCheckFailed(result);
        }
      },
    });
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    try {
      serverLogger.info('╔═══════════════════════════════════════╗');
      serverLogger.info('║   Jupiter Server Manager v1.0        ║');
      serverLogger.info('╚═══════════════════════════════════════╝');
      serverLogger.info('');

      // 1. 确保有Jupiter CLI二进制文件
      this.binaryPath = await this.ensureBinary();

      // 2. 启动进程
      await this.processManager.start(this.binaryPath);

      // 3. 等待健康
      const healthy = await this.healthChecker.waitUntilHealthy();
      if (!healthy) {
        throw new JupiterServerError(
          ErrorType.START_FAILED,
          'Server failed to become healthy after startup'
        );
      }

      // 4. 启动健康检查
      this.healthChecker.start();

      serverLogger.info('');
      serverLogger.info('╔═══════════════════════════════════════╗');
      serverLogger.info('║   ✅ Jupiter Server is ready!         ║');
      serverLogger.info('╚═══════════════════════════════════════╝');
      serverLogger.info(`API URL: http://${this.config.host || '127.0.0.1'}:${this.config.port || 8080}`);
      serverLogger.info('');
    } catch (error: any) {
      serverLogger.error(`Failed to start Jupiter Server: ${error.message}`);
      throw error;
    }
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    try {
      serverLogger.info('Stopping Jupiter Server...');

      // 1. 停止健康检查
      this.healthChecker.stop();

      // 2. 停止进程
      await this.processManager.stop();

      serverLogger.info('✅ Jupiter Server stopped successfully');
    } catch (error: any) {
      serverLogger.error(`Failed to stop server: ${error.message}`);
      throw error;
    }
  }

  /**
   * 重启服务器
   */
  async restart(): Promise<void> {
    if (!this.binaryPath) {
      throw new JupiterServerError(
        ErrorType.START_FAILED,
        'Cannot restart: binary path unknown'
      );
    }

    try {
      serverLogger.info('Restarting Jupiter Server...');

      // 1. 停止健康检查
      this.healthChecker.stop();

      // 2. 重启进程
      await this.processManager.restart(this.binaryPath);

      // 3. 等待健康
      await this.healthChecker.waitUntilHealthy();

      // 4. 重新启动健康检查
      this.healthChecker.start();

      serverLogger.info('✅ Jupiter Server restarted successfully');
    } catch (error: any) {
      serverLogger.error(`Failed to restart server: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取服务器信息
   */
  getInfo(): ServerInfo {
    const info = this.processManager.getInfo();
    const healthStats = this.healthChecker.getStats();

    return {
      ...info,
      lastHealthCheck: healthStats.lastCheck,
      healthy: healthStats.lastHealthy,
    };
  }

  /**
   * 获取当前状态
   */
  getStatus(): ServerStatus {
    return this.processManager.getStatus();
  }

  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return this.processManager.isRunning();
  }

  /**
   * 执行健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    return await this.healthChecker.performCheck();
  }

  /**
   * 确保Jupiter CLI二进制文件存在
   */
  private async ensureBinary(): Promise<string> {
    // 如果配置了路径，直接使用
    if (this.config.jupiter_cli_path) {
      serverLogger.info(`Using configured binary: ${this.config.jupiter_cli_path}`);
      return this.config.jupiter_cli_path;
    }

    // 检查默认路径
    const defaultPath = ConfigManager.getJupiterCliPath();
    
    if (await JupiterDownloader.validateBinary(defaultPath)) {
      serverLogger.info(`Using existing binary: ${defaultPath}`);
      return defaultPath;
    }

    // 需要下载
    if (!this.config.auto_download) {
      throw new JupiterServerError(
        ErrorType.DOWNLOAD_FAILED,
        `Jupiter CLI not found at ${defaultPath} and auto_download is disabled`
      );
    }

    serverLogger.info('Jupiter CLI not found, downloading...');

    const binaryPath = await JupiterDownloader.download({
      version: this.config.jupiter_version,
      onProgress: (progress) => {
        const percent = progress.percent.toFixed(1);
        const speed = (progress.speed / 1024 / 1024).toFixed(2);
        serverLogger.info(`Download progress: ${percent}% (${speed} MB/s)`);
      },
    });

    return binaryPath;
  }
}

/**
 * 从配置文件创建管理器
 */
export async function createFromConfig(
  configPath: string,
  callbacks?: ServerEventCallbacks
): Promise<JupiterServerManager> {
  const config = await ConfigManager.loadFromFile(configPath);
  return new JupiterServerManager(config, callbacks);
}

/**
 * CLI主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'start': {
        const configPath = args[1] || ConfigManager.getDefaultConfigPath();
        serverLogger.info(`Loading config from: ${configPath}`);

        const manager = await createFromConfig(configPath);
        await manager.start();

        // 保持运行
        process.on('SIGINT', async () => {
          serverLogger.info('\nReceived SIGINT, shutting down...');
          await manager.stop();
          process.exit(0);
        });

        process.on('SIGTERM', async () => {
          serverLogger.info('\nReceived SIGTERM, shutting down...');
          await manager.stop();
          process.exit(0);
        });

        break;
      }

      case 'init': {
        const outputPath = args[1] || path.join(process.cwd(), 'configs', 'jupiter-server.toml');
        await ConfigManager.createExampleConfig(outputPath);
        console.log(`✅ Example config created: ${outputPath}`);
        break;
      }

      case 'download': {
        console.log('Downloading Jupiter CLI...');
        const binaryPath = await JupiterDownloader.download({
          onProgress: (progress) => {
            const percent = progress.percent.toFixed(1);
            const speed = (progress.speed / 1024 / 1024).toFixed(2);
            process.stdout.write(`\rDownload progress: ${percent}% (${speed} MB/s)`);
          },
        });
        console.log(`\n✅ Jupiter CLI downloaded: ${binaryPath}`);
        break;
      }

      case 'version': {
        console.log('Jupiter Server Manager v1.0.0');
        break;
      }

      case 'help':
      default: {
        console.log(`
╔═══════════════════════════════════════╗
║   Jupiter Server Manager CLI          ║
╚═══════════════════════════════════════╝

Commands:

  start [config_path]
    Start Jupiter API server
    Default config: configs/jupiter-server.toml
    
  init [output_path]
    Create example configuration file
    
  download
    Download Jupiter CLI binary
    
  version
    Show version information
    
  help
    Show this help message

Examples:

  # Initialize config
  npm run jupiter-server init
  
  # Start server
  npm run jupiter-server start
  
  # Start with custom config
  npm run jupiter-server start ./my-config.toml
  
  # Download binary manually
  npm run jupiter-server download

Configuration:

  Edit configs/jupiter-server.toml:
  - Set your RPC URL
  - Configure port and host
  - Enable/disable features
  - Set health check intervals

Documentation:

  See README.md for detailed usage guide
        `);
        break;
      }
    }
  } catch (error: any) {
    serverLogger.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

// 运行CLI
if (require.main === module) {
  main();
}

// 导出
export {
  ConfigManager,
  JupiterDownloader,
  ProcessManager,
  HealthChecker,
};

export * from './types';
