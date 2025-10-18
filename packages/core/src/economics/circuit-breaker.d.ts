/**
 * 熔断机制
 *
 * 实现自动保护系统，防止连续亏损和异常情况，包括：
 * - 连续失败检测
 * - 亏损阈值监控
 * - 成功率追踪
 * - 自动熔断和恢复
 */
import { CircuitBreakerConfig, CircuitBreakerStatus, CircuitBreakerMetrics, CircuitBreakerCheckResult, TransactionResult } from './types';
/**
 * 熔断器配置（扩展）
 */
export interface ExtendedCircuitBreakerConfig extends CircuitBreakerConfig {
    /** 熔断后的冷却时间（毫秒，默认 5 分钟） */
    cooldownPeriod?: number;
    /** 半开状态允许的测试次数（默认 3） */
    halfOpenTestAttempts?: number;
    /** 启用自动恢复（默认 true） */
    autoRecovery?: boolean;
}
/**
 * 熔断机制
 */
export declare class CircuitBreaker {
    private static readonly DEFAULT_COOLDOWN_PERIOD;
    private static readonly DEFAULT_HALF_OPEN_ATTEMPTS;
    private readonly config;
    private status;
    private metrics;
    private breakTime;
    private halfOpenAttempts;
    constructor(config: ExtendedCircuitBreakerConfig);
    /**
     * 初始化指标
     */
    private initializeMetrics;
    /**
     * 记录交易结果
     * @param result 交易结果
     */
    recordTransaction(result: TransactionResult): void;
    /**
     * 检查是否应该熔断
     * @returns 熔断检查结果
     */
    shouldBreak(): CircuitBreakerCheckResult;
    /**
     * 检查是否可以尝试交易
     * @returns 是否允许交易
     */
    canAttempt(): boolean;
    /**
     * 打开熔断器（禁止交易）
     * @param reason 原因
     */
    private open;
    /**
     * 进入半开状态（测试恢复）
     */
    private halfOpen;
    /**
     * 关闭熔断器（恢复正常）
     */
    private close;
    /**
     * 手动重置熔断器
     */
    reset(): void;
    /**
     * 检查并重置小时统计
     */
    private checkHourlyReset;
    /**
     * 获取当前状态
     * @returns 熔断器状态
     */
    getStatus(): CircuitBreakerStatus;
    /**
     * 获取当前指标
     * @returns 指标快照
     */
    getMetrics(): CircuitBreakerMetrics;
    /**
     * 获取剩余冷却时间
     * @returns 剩余时间（毫秒），如果未熔断则返回 0
     */
    getRemainingCooldown(): number;
    /**
     * 生成状态报告
     * @returns 格式化的状态报告
     */
    generateStatusReport(): string;
    /**
     * 获取健康分数（0-100）
     * @returns 健康分数
     */
    getHealthScore(): number;
    /**
     * 导出数据（用于持久化）
     * @returns 可序列化的数据
     */
    export(): {
        config: ExtendedCircuitBreakerConfig;
        status: CircuitBreakerStatus;
        metrics: CircuitBreakerMetrics;
        breakTime: number;
    };
    /**
     * 从导出的数据恢复
     * @param data 导出的数据
     */
    static restore(data: ReturnType<CircuitBreaker['export']>): CircuitBreaker;
}
//# sourceMappingURL=circuit-breaker.d.ts.map