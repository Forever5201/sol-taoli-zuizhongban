"use strict";
/**
 * 熔断机制
 *
 * 实现自动保护系统，防止连续亏损和异常情况，包括：
 * - 连续失败检测
 * - 亏损阈值监控
 * - 成功率追踪
 * - 自动熔断和恢复
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
/**
 * 熔断机制
 */
class CircuitBreaker {
    static DEFAULT_COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes
    static DEFAULT_HALF_OPEN_ATTEMPTS = 3;
    config;
    status = 'closed';
    metrics;
    breakTime = 0;
    halfOpenAttempts = 0;
    constructor(config) {
        this.config = {
            ...config,
            cooldownPeriod: config.cooldownPeriod || CircuitBreaker.DEFAULT_COOLDOWN_PERIOD,
            halfOpenTestAttempts: config.halfOpenTestAttempts || CircuitBreaker.DEFAULT_HALF_OPEN_ATTEMPTS,
            autoRecovery: config.autoRecovery !== false,
        };
        this.metrics = this.initializeMetrics();
    }
    /**
     * 初始化指标
     */
    initializeMetrics() {
        return {
            consecutiveFailures: 0,
            hourlyProfit: 0,
            hourlyLoss: 0,
            totalAttempts: 0,
            successCount: 0,
            successRate: 0,
            netProfit: 0,
            startTime: Date.now(),
        };
    }
    /**
     * 记录交易结果
     * @param result 交易结果
     */
    recordTransaction(result) {
        this.metrics.totalAttempts++;
        if (result.success) {
            // 成功交易
            this.metrics.consecutiveFailures = 0;
            this.metrics.successCount++;
            if (result.profit) {
                this.metrics.hourlyProfit += result.profit;
                this.metrics.netProfit += result.profit;
            }
            // 如果在半开状态，记录测试成功
            if (this.status === 'half-open') {
                this.halfOpenAttempts++;
                // 如果测试成功达到阈值，恢复到关闭状态
                if (this.halfOpenAttempts >= this.config.halfOpenTestAttempts) {
                    this.close();
                }
            }
        }
        else {
            // 失败交易
            this.metrics.consecutiveFailures++;
            if (result.cost) {
                this.metrics.hourlyLoss += result.cost;
                this.metrics.netProfit -= result.cost;
            }
            // 如果在半开状态失败，立即回到开启状态
            if (this.status === 'half-open') {
                this.open('半开状态测试失败');
            }
        }
        // 更新成功率
        this.metrics.successRate = this.metrics.successCount / this.metrics.totalAttempts;
        // 每小时重置统计
        this.checkHourlyReset();
        // 检查是否需要熔断
        if (this.status === 'closed') {
            const checkResult = this.shouldBreak();
            if (checkResult.shouldBreak) {
                this.open(checkResult.reason);
            }
        }
    }
    /**
     * 检查是否应该熔断
     * @returns 熔断检查结果
     */
    shouldBreak() {
        const { config, metrics } = this;
        // 条件 1: 连续失败次数过多
        if (metrics.consecutiveFailures >= config.maxConsecutiveFailures) {
            return {
                shouldBreak: true,
                reason: `连续失败 ${metrics.consecutiveFailures} 次，达到阈值 ${config.maxConsecutiveFailures}`,
                metrics: { ...metrics },
            };
        }
        // 条件 2: 小时亏损超过阈值
        if (metrics.hourlyLoss > config.maxHourlyLoss) {
            return {
                shouldBreak: true,
                reason: `小时亏损 ${metrics.hourlyLoss} lamports，超过阈值 ${config.maxHourlyLoss}`,
                metrics: { ...metrics },
            };
        }
        // 条件 3: 成功率过低（至少有 20 次尝试后才检查）
        if (metrics.totalAttempts >= 20 &&
            metrics.successRate < config.minSuccessRate) {
            return {
                shouldBreak: true,
                reason: `成功率 ${(metrics.successRate * 100).toFixed(1)}% 低于阈值 ${(config.minSuccessRate * 100).toFixed(1)}%`,
                metrics: { ...metrics },
            };
        }
        // 条件 4: 净利润为负（至少有 10 次尝试后才检查）
        if (metrics.totalAttempts >= 10 && metrics.netProfit < 0) {
            return {
                shouldBreak: true,
                reason: `净利润为负（${metrics.netProfit} lamports）`,
                metrics: { ...metrics },
            };
        }
        return {
            shouldBreak: false,
            metrics: { ...metrics },
        };
    }
    /**
     * 检查是否可以尝试交易
     * @returns 是否允许交易
     */
    canAttempt() {
        const now = Date.now();
        switch (this.status) {
            case 'closed':
                return true;
            case 'open':
                // 检查是否已过冷却期
                if (this.config.autoRecovery && now - this.breakTime >= this.config.cooldownPeriod) {
                    this.halfOpen();
                    return true;
                }
                return false;
            case 'half-open':
                return true;
            default:
                return false;
        }
    }
    /**
     * 打开熔断器（禁止交易）
     * @param reason 原因
     */
    open(reason) {
        this.status = 'open';
        this.breakTime = Date.now();
        this.halfOpenAttempts = 0;
        console.warn(`🚨 熔断器已打开: ${reason}`);
        console.warn(`冷却时间: ${this.config.cooldownPeriod / 1000} 秒`);
    }
    /**
     * 进入半开状态（测试恢复）
     */
    halfOpen() {
        this.status = 'half-open';
        this.halfOpenAttempts = 0;
        console.info(`⚠️  熔断器进入半开状态，开始测试恢复...`);
    }
    /**
     * 关闭熔断器（恢复正常）
     */
    close() {
        this.status = 'closed';
        this.breakTime = 0;
        this.halfOpenAttempts = 0;
        console.info(`✅ 熔断器已关闭，恢复正常运行`);
    }
    /**
     * 手动重置熔断器
     */
    reset() {
        this.status = 'closed';
        this.breakTime = 0;
        this.halfOpenAttempts = 0;
        this.metrics = this.initializeMetrics();
        console.info('🔄 熔断器已手动重置');
    }
    /**
     * 检查并重置小时统计
     */
    checkHourlyReset() {
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;
        if (now - this.metrics.startTime >= hourInMs) {
            console.info(`📊 小时统计重置 - 利润: ${this.metrics.hourlyProfit}, 亏损: ${this.metrics.hourlyLoss}`);
            this.metrics.hourlyProfit = 0;
            this.metrics.hourlyLoss = 0;
            this.metrics.startTime = now;
        }
    }
    /**
     * 获取当前状态
     * @returns 熔断器状态
     */
    getStatus() {
        return this.status;
    }
    /**
     * 获取当前指标
     * @returns 指标快照
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * 获取剩余冷却时间
     * @returns 剩余时间（毫秒），如果未熔断则返回 0
     */
    getRemainingCooldown() {
        if (this.status !== 'open') {
            return 0;
        }
        const elapsed = Date.now() - this.breakTime;
        const remaining = this.config.cooldownPeriod - elapsed;
        return Math.max(remaining, 0);
    }
    /**
     * 生成状态报告
     * @returns 格式化的状态报告
     */
    generateStatusReport() {
        const { metrics, status } = this;
        const netProfitSOL = (metrics.netProfit / 1_000_000_000).toFixed(6);
        const hourlyProfitSOL = (metrics.hourlyProfit / 1_000_000_000).toFixed(6);
        const hourlyLossSOL = (metrics.hourlyLoss / 1_000_000_000).toFixed(6);
        const statusEmoji = {
            closed: '🟢',
            open: '🔴',
            'half-open': '🟡',
        }[status];
        const lines = [
            '========== 熔断器状态报告 ==========',
            `状态: ${statusEmoji} ${status.toUpperCase()}`,
            '',
            '性能指标:',
            `  总尝试次数: ${metrics.totalAttempts}`,
            `  成功次数: ${metrics.successCount}`,
            `  成功率: ${(metrics.successRate * 100).toFixed(1)}%`,
            `  连续失败: ${metrics.consecutiveFailures}`,
            '',
            '财务指标:',
            `  净利润: ${netProfitSOL} SOL`,
            `  小时利润: ${hourlyProfitSOL} SOL`,
            `  小时亏损: ${hourlyLossSOL} SOL`,
            '',
            '阈值配置:',
            `  最大连续失败: ${this.config.maxConsecutiveFailures}`,
            `  最大小时亏损: ${(this.config.maxHourlyLoss / 1_000_000_000).toFixed(6)} SOL`,
            `  最低成功率: ${(this.config.minSuccessRate * 100).toFixed(1)}%`,
        ];
        if (status === 'open') {
            const remainingSeconds = Math.ceil(this.getRemainingCooldown() / 1000);
            lines.push('', `⏳ 剩余冷却时间: ${remainingSeconds} 秒`);
        }
        if (status === 'half-open') {
            lines.push('', `🧪 测试进度: ${this.halfOpenAttempts}/${this.config.halfOpenTestAttempts}`);
        }
        lines.push('====================================');
        return lines.join('\n');
    }
    /**
     * 获取健康分数（0-100）
     * @returns 健康分数
     */
    getHealthScore() {
        const { metrics, config } = this;
        let score = 100;
        // 成功率影响（权重 40%）
        const successRateScore = metrics.successRate * 40;
        score = score - 40 + successRateScore;
        // 连续失败影响（权重 30%）
        const failureRatio = metrics.consecutiveFailures / config.maxConsecutiveFailures;
        const failureScore = Math.max(0, 30 - failureRatio * 30);
        score = score - 30 + failureScore;
        // 盈利能力影响（权重 30%）
        let profitScore = 30;
        if (metrics.netProfit < 0) {
            profitScore = 0;
        }
        else if (metrics.netProfit > 0) {
            profitScore = Math.min(30, (metrics.netProfit / 100_000_000) * 10);
        }
        score = score - 30 + profitScore;
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    /**
     * 导出数据（用于持久化）
     * @returns 可序列化的数据
     */
    export() {
        return {
            config: { ...this.config },
            status: this.status,
            metrics: { ...this.metrics },
            breakTime: this.breakTime,
        };
    }
    /**
     * 从导出的数据恢复
     * @param data 导出的数据
     */
    static restore(data) {
        const breaker = new CircuitBreaker(data.config);
        breaker.status = data.status;
        breaker.metrics = { ...data.metrics };
        breaker.breakTime = data.breakTime;
        return breaker;
    }
}
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=circuit-breaker.js.map