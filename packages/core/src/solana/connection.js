"use strict";
/**
 * RPC 连接池
 *
 * 管理多个 RPC 端点，提供负载均衡、速率限制和健康检查功能
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionPool = void 0;
const web3_js_1 = require("@solana/web3.js");
const bottleneck_1 = __importDefault(require("bottleneck"));
const logger_1 = require("../logger");
const connectionLogger = logger_1.logger.child({ module: 'ConnectionPool' });
/**
 * RPC连接池类
 */
class ConnectionPool {
    connections;
    limiters;
    healthStatus;
    commitment;
    healthCheckTimer;
    constructor(config) {
        const { endpoints, commitment = 'confirmed', minTime = 10, maxConcurrent = 50, healthCheckInterval = 60000, // 60 seconds
         } = config;
        if (endpoints.length === 0) {
            throw new Error('At least one RPC endpoint is required');
        }
        this.connections = new Map();
        this.limiters = new Map();
        this.healthStatus = new Map();
        this.commitment = commitment;
        // 初始化每个端点
        for (const endpoint of endpoints) {
            this.connections.set(endpoint, new web3_js_1.Connection(endpoint, commitment));
            this.limiters.set(endpoint, new bottleneck_1.default({
                minTime,
                maxConcurrent,
                reservoir: maxConcurrent * 10, // 初始令牌数
                reservoirRefreshAmount: maxConcurrent * 10,
                reservoirRefreshInterval: 1000, // 每秒刷新
            }));
            this.healthStatus.set(endpoint, {
                endpoint,
                isHealthy: true,
                latency: 0,
                lastChecked: 0,
                errorCount: 0,
            });
        }
        connectionLogger.info(`ConnectionPool initialized with ${endpoints.length} endpoints`);
        // 启动健康检查
        if (healthCheckInterval > 0) {
            this.startHealthCheck(healthCheckInterval);
        }
    }
    /**
     * 获取最佳连接（基于健康状态和延迟）
     * @returns Connection对象
     */
    getBestConnection() {
        const healthyEndpoints = Array.from(this.healthStatus.values())
            .filter((status) => status.isHealthy)
            .sort((a, b) => a.latency - b.latency);
        if (healthyEndpoints.length === 0) {
            // 如果没有健康的端点，返回第一个
            connectionLogger.warn('No healthy endpoints, using first available');
            return this.connections.values().next().value;
        }
        const bestEndpoint = healthyEndpoints[0].endpoint;
        return this.connections.get(bestEndpoint);
    }
    /**
     * 批量获取账户信息
     * @param pubkeys 公钥列表
     * @returns 账户信息数组
     */
    async getMultipleAccounts(pubkeys) {
        const connection = this.getBestConnection();
        const endpoint = this.getEndpointForConnection(connection);
        const limiter = this.limiters.get(endpoint);
        try {
            const startTime = Date.now();
            const result = await limiter.schedule(() => connection.getMultipleAccountsInfo(pubkeys));
            const latency = Date.now() - startTime;
            this.updateHealthStatus(endpoint, true, latency);
            connectionLogger.debug(`getMultipleAccounts: ${pubkeys.length} accounts in ${latency}ms from ${endpoint}`);
            return result;
        }
        catch (error) {
            this.updateHealthStatus(endpoint, false, 0);
            connectionLogger.error(`getMultipleAccounts failed: ${error}`);
            throw error;
        }
    }
    /**
     * 并发广播交易到所有RPC（Spam策略）
     * @param transaction 交易对象
     * @param options 发送选项
     * @returns 所有端点的结果
     */
    async broadcastTransaction(transaction, options = { skipPreflight: true }) {
        const serializedTx = transaction.serialize();
        const promises = [];
        for (const [endpoint, connection] of this.connections.entries()) {
            const limiter = this.limiters.get(endpoint);
            const promise = (async () => {
                const startTime = Date.now();
                try {
                    const signature = await limiter.schedule(() => connection.sendRawTransaction(serializedTx, options));
                    const latency = Date.now() - startTime;
                    this.updateHealthStatus(endpoint, true, latency);
                    return {
                        endpoint,
                        signature,
                        success: true,
                        latency,
                    };
                }
                catch (error) {
                    const latency = Date.now() - startTime;
                    this.updateHealthStatus(endpoint, false, latency);
                    return {
                        endpoint,
                        success: false,
                        error: error,
                        latency,
                    };
                }
            })();
            promises.push(promise);
        }
        const results = await Promise.all(promises);
        const successCount = results.filter((r) => r.success).length;
        connectionLogger.info(`Transaction broadcast: ${successCount}/${results.length} successful`);
        return results;
    }
    /**
     * 执行健康检查
     * @returns 所有端点的健康状态
     */
    async healthCheck() {
        const promises = [];
        for (const [endpoint, connection] of this.connections.entries()) {
            const promise = (async () => {
                const startTime = Date.now();
                try {
                    await connection.getSlot();
                    const latency = Date.now() - startTime;
                    this.updateHealthStatus(endpoint, true, latency);
                }
                catch (error) {
                    this.updateHealthStatus(endpoint, false, 0);
                }
            })();
            promises.push(promise);
        }
        await Promise.all(promises);
        return Array.from(this.healthStatus.values());
    }
    /**
     * 更新端点健康状态
     * @param endpoint 端点URL
     * @param success 是否成功
     * @param latency 延迟（ms）
     */
    updateHealthStatus(endpoint, success, latency) {
        const status = this.healthStatus.get(endpoint);
        if (!status)
            return;
        status.lastChecked = Date.now();
        if (success) {
            status.errorCount = Math.max(0, status.errorCount - 1);
            status.latency = latency;
            // 如果连续成功，标记为健康
            if (status.errorCount === 0) {
                status.isHealthy = true;
            }
        }
        else {
            status.errorCount++;
            // 如果连续失败3次，标记为不健康
            if (status.errorCount >= 3) {
                status.isHealthy = false;
                connectionLogger.warn(`Endpoint ${endpoint} marked as unhealthy`);
            }
        }
    }
    /**
     * 根据Connection对象获取端点URL
     * @param connection Connection对象
     * @returns 端点URL或undefined
     */
    getEndpointForConnection(connection) {
        for (const [endpoint, conn] of this.connections.entries()) {
            if (conn === connection) {
                return endpoint;
            }
        }
        return undefined;
    }
    /**
     * 启动后台健康检查
     * @param interval 检查间隔（ms）
     */
    startHealthCheck(interval) {
        this.healthCheckTimer = setInterval(async () => {
            try {
                await this.healthCheck();
                connectionLogger.debug('Health check completed');
            }
            catch (error) {
                connectionLogger.error(`Health check error: ${error}`);
            }
        }, interval);
        connectionLogger.info(`Health check started (interval: ${interval}ms)`);
    }
    /**
     * 停止健康检查
     */
    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = undefined;
            connectionLogger.info('Health check stopped');
        }
    }
    /**
     * 获取所有端点的健康状态
     * @returns 健康状态数组
     */
    getHealthStatus() {
        return Array.from(this.healthStatus.values());
    }
    /**
     * 获取健康端点数量
     * @returns 健康端点数量
     */
    getHealthyEndpointCount() {
        return Array.from(this.healthStatus.values()).filter((s) => s.isHealthy).length;
    }
    /**
     * 清理资源
     */
    destroy() {
        this.stopHealthCheck();
        connectionLogger.info('ConnectionPool destroyed');
    }
}
exports.ConnectionPool = ConnectionPool;
exports.default = ConnectionPool;
//# sourceMappingURL=connection.js.map