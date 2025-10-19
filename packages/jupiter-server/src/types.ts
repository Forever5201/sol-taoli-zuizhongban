/**
 * Jupiter Server 类型定义
 * 
 * 定义Jupiter API服务器管理的所有类型接口
 */

import { ChildProcess } from 'child_process';

/**
 * Jupiter Server 配置
 */
export interface JupiterServerConfig {
  // === 基础配置 ===
  rpc_url: string;                          // Solana RPC URL
  port?: number;                            // API监听端口（默认8080）
  host?: string;                            // 绑定主机（默认127.0.0.1）
  
  // === Jupiter配置 ===
  allow_circular_arbitrage?: boolean;       // 启用环形套利（默认true）
  jupiter_cli_path?: string;                // jupiter-cli路径（可选）
  jupiter_version?: string;                 // Jupiter版本（默认latest）
  
  // === 管理配置 ===
  auto_download?: boolean;                  // 自动下载jupiter-cli（默认true）
  auto_restart?: boolean;                   // 自动重启（默认true）
  max_restart_attempts?: number;            // 最大重启次数（默认3）
  restart_delay_ms?: number;                // 重启延迟（默认5000ms）
  
  // === 健康检查 ===
  health_check_enabled?: boolean;           // 启用健康检查（默认true）
  health_check_interval_ms?: number;        // 检查间隔（默认10000ms）
  health_check_timeout_ms?: number;         // 检查超时（默认5000ms）
  health_check_endpoint?: string;           // 健康检查端点（默认/health）
  
  // === 日志配置 ===
  log_level?: 'trace' | 'debug' | 'info' | 'warn' | 'error'; // 日志级别
  log_file?: string;                        // 日志文件路径
  
  // === 性能配置 ===
  worker_threads?: number;                  // Worker线程数
  cache_size?: number;                      // 缓存大小
  
  // === 环境变量 ===
  env?: Record<string, string>;             // 额外的环境变量
}

/**
 * 服务器状态
 */
export enum ServerStatus {
  STOPPED = 'stopped',           // 已停止
  STARTING = 'starting',         // 启动中
  RUNNING = 'running',           // 运行中
  STOPPING = 'stopping',         // 停止中
  RESTARTING = 'restarting',     // 重启中
  ERROR = 'error',               // 错误状态
  DOWNLOADING = 'downloading',   // 下载中
}

/**
 * 服务器信息
 */
export interface ServerInfo {
  status: ServerStatus;                     // 当前状态
  pid?: number;                             // 进程ID
  port: number;                             // 监听端口
  uptime?: number;                          // 运行时间（秒）
  restartCount: number;                     // 重启次数
  lastError?: string;                       // 最后错误
  lastHealthCheck?: Date;                   // 最后健康检查时间
  healthy: boolean;                         // 是否健康
  version?: string;                         // Jupiter版本
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  healthy: boolean;                         // 是否健康
  responseTime?: number;                    // 响应时间（ms）
  error?: string;                           // 错误信息
  timestamp: Date;                          // 检查时间
  endpoints: {                              // 各端点状态
    health: boolean;
    quote?: boolean;
    swap?: boolean;
  };
}

/**
 * 下载进度
 */
export interface DownloadProgress {
  total: number;                            // 总大小（字节）
  downloaded: number;                       // 已下载（字节）
  percent: number;                          // 百分比
  speed: number;                            // 速度（字节/秒）
}

/**
 * 下载选项
 */
export interface DownloadOptions {
  version?: string;                         // 版本号（默认latest）
  targetPath?: string;                      // 下载目标路径
  forceDownload?: boolean;                  // 强制重新下载
  onProgress?: (progress: DownloadProgress) => void; // 进度回调
}

/**
 * 平台信息
 */
export interface PlatformInfo {
  os: 'linux' | 'darwin' | 'win32';         // 操作系统
  arch: 'x64' | 'arm64';                    // 架构
  binaryName: string;                       // 二进制文件名
  downloadUrl: string;                      // 下载URL
}

/**
 * 进程管理器选项
 */
export interface ProcessManagerOptions {
  command: string;                          // 命令路径
  args?: string[];                          // 命令参数
  env?: Record<string, string>;             // 环境变量
  cwd?: string;                             // 工作目录
  stdout?: 'pipe' | 'inherit' | 'ignore';   // 标准输出处理
  stderr?: 'pipe' | 'inherit' | 'ignore';   // 标准错误处理
}

/**
 * 进程信息
 */
export interface ProcessInfo {
  process?: ChildProcess;                   // 子进程对象
  pid?: number;                             // 进程ID
  startTime?: Date;                         // 启动时间
  exitCode?: number;                        // 退出码
  signal?: string;                          // 退出信号
}

/**
 * 错误类型
 */
export enum ErrorType {
  DOWNLOAD_FAILED = 'download_failed',
  START_FAILED = 'start_failed',
  HEALTH_CHECK_FAILED = 'health_check_failed',
  PROCESS_CRASHED = 'process_crashed',
  CONFIG_INVALID = 'config_invalid',
}

/**
 * Jupiter Server 错误
 */
export class JupiterServerError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'JupiterServerError';
  }
}

/**
 * 事件回调
 */
export interface ServerEventCallbacks {
  onStart?: () => void;
  onStop?: () => void;
  onRestart?: (count: number) => void;
  onError?: (error: Error) => void;
  onHealthCheckFailed?: (result: HealthCheckResult) => void;
  onHealthCheckSuccess?: (result: HealthCheckResult) => void;
}

/**
 * Jupiter API 响应类型
 */
export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

/**
 * Jupiter Health 响应
 */
export interface JupiterHealthResponse {
  status: 'ok' | 'error';
  version?: string;
  timestamp?: number;
}
