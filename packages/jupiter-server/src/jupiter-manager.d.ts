/**
 * Jupiter Server Manager
 *
 * 负责管理自托管的 Jupiter API Server
 * - 自动下载 jupiter-cli 二进制文件
 * - 启动/停止/重启进程
 * - 健康检查和监控
 * - 自动故障恢复
 */
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
export declare class JupiterServerManager {
    private config;
    private process;
    private isRunning;
    private startTime?;
    private restartAttempts;
    private readonly MAX_RESTART_ATTEMPTS;
    private healthCheckInterval?;
    constructor(config: JupiterServerConfig);
    /**
     * 确保 Jupiter CLI 存在（如果不存在则下载）
     */
    ensureJupiterCli(): Promise<void>;
    /**
     * 启动 Jupiter Server
     */
    start(): Promise<void>;
    /**
     * 等待服务就绪
     */
    private waitForReady;
    /**
     * 健康检查
     */
    healthCheck(): Promise<boolean>;
    /**
     * 启动定期健康检查
     */
    private startHealthCheck;
    /**
     * 停止服务
     */
    stop(): Promise<void>;
    /**
     * 重启服务
     */
    restart(): Promise<void>;
    /**
     * 获取服务状态
     */
    getStatus(): JupiterServerStatus;
    /**
     * 测试查询（用于验证功能）
     */
    testQuery(inputMint: string, outputMint: string, amount: number): Promise<any>;
    /**
     * 休眠辅助函数
     */
    private sleep;
}
//# sourceMappingURL=jupiter-manager.d.ts.map