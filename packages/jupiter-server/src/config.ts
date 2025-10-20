/**
 * Jupiter Server 配置管理器
 * 
 * 负责加载、验证和管理服务器配置
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as toml from 'toml';
import { JupiterServerConfig, JupiterServerError, ErrorType } from './types';
import { logger } from '@solana-arb-bot/core';

const configLogger = logger.child({ module: 'jupiter-server:config' });

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Required<Omit<JupiterServerConfig, 'rpc_url'>> = {
  port: 8080,
  host: '127.0.0.1',
  allow_circular_arbitrage: true,
  jupiter_cli_path: undefined as any,
  jupiter_version: 'latest',
  auto_download: true,
  auto_restart: true,
  max_restart_attempts: 3,
  restart_delay_ms: 5000,
  health_check_enabled: true,
  health_check_interval_ms: 10000,
  health_check_timeout_ms: 5000,
  health_check_endpoint: '/health',
  log_level: 'info',
  log_file: undefined as any,
  worker_threads: 4,
  cache_size: 1000,
  env: {},
};

/**
 * 配置管理器
 */
export class ConfigManager {
  /**
   * 从文件加载配置
   */
  static async loadFromFile(filePath: string): Promise<JupiterServerConfig> {
    try {
      configLogger.info(`Loading config from: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new JupiterServerError(
          ErrorType.CONFIG_INVALID,
          `Config file not found: ${filePath}`
        );
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = toml.parse(content);

      // 提取jupiter-server配置
      const config = parsed['jupiter-server'] || parsed;

      // 验证配置
      this.validateConfig(config);

      // 合并默认配置
      const mergedConfig = this.mergeWithDefaults(config);

      configLogger.info('Config loaded successfully');
      return mergedConfig;
    } catch (error: any) {
      configLogger.error(`Failed to load config: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  static validateConfig(config: any): void {
    // 必需字段检查
    if (!config.rpc_url) {
      throw new JupiterServerError(
        ErrorType.CONFIG_INVALID,
        'Missing required field: rpc_url'
      );
    }

    // RPC URL格式验证
    try {
      new URL(config.rpc_url);
    } catch {
      throw new JupiterServerError(
        ErrorType.CONFIG_INVALID,
        `Invalid rpc_url format: ${config.rpc_url}`
      );
    }

    // 端口范围验证
    if (config.port && (config.port < 1 || config.port > 65535)) {
      throw new JupiterServerError(
        ErrorType.CONFIG_INVALID,
        `Invalid port number: ${config.port}. Must be between 1-65535`
      );
    }

    // 重启次数验证
    if (config.max_restart_attempts && config.max_restart_attempts < 0) {
      throw new JupiterServerError(
        ErrorType.CONFIG_INVALID,
        'max_restart_attempts must be >= 0'
      );
    }

    // 间隔时间验证
    if (config.health_check_interval_ms && config.health_check_interval_ms < 1000) {
      throw new JupiterServerError(
        ErrorType.CONFIG_INVALID,
        'health_check_interval_ms must be >= 1000 (1 second)'
      );
    }

    configLogger.debug('Config validation passed');
  }

  /**
   * 合并默认配置
   */
  static mergeWithDefaults(config: Partial<JupiterServerConfig>): JupiterServerConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      rpc_url: config.rpc_url || 'https://api.mainnet-beta.solana.com', // 添加默认值
      env: {
        ...DEFAULT_CONFIG.env,
        ...config.env,
      },
    };
  }

  /**
   * 创建示例配置文件
   */
  static async createExampleConfig(outputPath: string): Promise<void> {
    const exampleConfig = `# Jupiter Server 配置文件
# 管理本地Jupiter v6 API实例

[jupiter-server]
# ============================================
# 基础配置
# ============================================

# Solana RPC URL（必需）
rpc_url = "https://api.mainnet-beta.solana.com"
# 也可以使用：
# rpc_url = "\${DEFAULT_RPC_URL}"  # 从global.toml引用

# API监听端口
port = 8080

# 绑定主机（安全起见，仅本地访问）
host = "127.0.0.1"

# ============================================
# Jupiter配置
# ============================================

# 启用环形套利（关键！）
allow_circular_arbitrage = true

# Jupiter CLI版本（默认latest）
jupiter_version = "latest"

# 自定义Jupiter CLI路径（可选）
# jupiter_cli_path = "/path/to/jupiter-cli"

# Worker线程数（影响查询性能）
worker_threads = 4

# 缓存大小
cache_size = 1000

# ============================================
# 管理配置
# ============================================

# 自动下载jupiter-cli
auto_download = true

# 自动重启（进程崩溃时）
auto_restart = true

# 最大重启次数
max_restart_attempts = 3

# 重启延迟（毫秒）
restart_delay_ms = 5000

# ============================================
# 健康检查
# ============================================

# 启用健康检查
health_check_enabled = true

# 检查间隔（毫秒）
health_check_interval_ms = 10000

# 检查超时（毫秒）
health_check_timeout_ms = 5000

# 健康检查端点
health_check_endpoint = "/health"

# ============================================
# 日志配置
# ============================================

# 日志级别: trace, debug, info, warn, error
log_level = "info"

# 日志文件路径（可选）
# log_file = "./logs/jupiter-server.log"

# ============================================
# 额外环境变量（可选）
# ============================================

[jupiter-server.env]
# 自定义环境变量将传递给jupiter-cli进程
# RUST_LOG = "info"
`;

    await fs.writeFile(outputPath, exampleConfig, 'utf-8');
    configLogger.info(`Example config created: ${outputPath}`);
  }

  /**
   * 获取默认配置路径
   */
  static getDefaultConfigPath(): string {
    return path.join(process.cwd(), 'configs', 'jupiter-server.toml');
  }

  /**
   * 配置是否存在
   */
  static async configExists(filePath?: string): Promise<boolean> {
    const targetPath = filePath || this.getDefaultConfigPath();
    return fs.pathExists(targetPath);
  }

  /**
   * 获取Jupiter CLI默认路径
   */
  static getJupiterCliPath(): string {
    const platform = process.platform;
    const binaryName = platform === 'win32' ? 'jupiter-cli.exe' : 'jupiter-cli';
    return path.join(process.cwd(), 'bin', binaryName);
  }

  /**
   * 导出配置为JSON（调试用）
   */
  static exportToJson(config: JupiterServerConfig): string {
    return JSON.stringify(config, null, 2);
  }
}
