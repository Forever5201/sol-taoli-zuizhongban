/**
 * RPC 连接池
 *
 * 管理多个 RPC 端点，提供负载均衡、速率限制和健康检查功能
 */
import { Connection, Commitment, PublicKey, AccountInfo, Transaction, SendOptions, TransactionSignature } from '@solana/web3.js';
/**
 * RPC健康状态
 */
export interface RpcHealthStatus {
    endpoint: string;
    isHealthy: boolean;
    latency: number;
    lastChecked: number;
    errorCount: number;
}
/**
 * 广播结果
 */
export interface BroadcastResult {
    endpoint: string;
    signature?: TransactionSignature;
    success: boolean;
    error?: Error;
    latency: number;
}
/**
 * 连接池配置
 */
export interface ConnectionPoolConfig {
    /** RPC端点列表 */
    endpoints: string[];
    /** 提交级别 */
    commitment?: Commitment;
    /** 每个端点的最小请求间隔（ms） */
    minTime?: number;
    /** 每个端点的最大并发数 */
    maxConcurrent?: number;
    /** 健康检查间隔（ms） */
    healthCheckInterval?: number;
}
/**
 * RPC连接池类
 */
export declare class ConnectionPool {
    private connections;
    private limiters;
    private healthStatus;
    private commitment;
    private healthCheckTimer?;
    constructor(config: ConnectionPoolConfig);
    /**
     * 获取最佳连接（基于健康状态和延迟）
     * @returns Connection对象
     */
    getBestConnection(): Connection;
    /**
     * 批量获取账户信息
     * @param pubkeys 公钥列表
     * @returns 账户信息数组
     */
    getMultipleAccounts(pubkeys: PublicKey[]): Promise<(AccountInfo<Buffer> | null)[]>;
    /**
     * 并发广播交易到所有RPC（Spam策略）
     * @param transaction 交易对象
     * @param options 发送选项
     * @returns 所有端点的结果
     */
    broadcastTransaction(transaction: Transaction, options?: SendOptions): Promise<BroadcastResult[]>;
    /**
     * 执行健康检查
     * @returns 所有端点的健康状态
     */
    healthCheck(): Promise<RpcHealthStatus[]>;
    /**
     * 更新端点健康状态
     * @param endpoint 端点URL
     * @param success 是否成功
     * @param latency 延迟（ms）
     */
    private updateHealthStatus;
    /**
     * 根据Connection对象获取端点URL
     * @param connection Connection对象
     * @returns 端点URL或undefined
     */
    private getEndpointForConnection;
    /**
     * 启动后台健康检查
     * @param interval 检查间隔（ms）
     */
    private startHealthCheck;
    /**
     * 停止健康检查
     */
    stopHealthCheck(): void;
    /**
     * 获取所有端点的健康状态
     * @returns 健康状态数组
     */
    getHealthStatus(): RpcHealthStatus[];
    /**
     * 获取健康端点数量
     * @returns 健康端点数量
     */
    getHealthyEndpointCount(): number;
    /**
     * 清理资源
     */
    destroy(): void;
}
export default ConnectionPool;
//# sourceMappingURL=connection.d.ts.map