/**
 * Jito 小费优化器
 *
 * 实现智能的动态出价策略，包括：
 * - 实时获取 Jito 市场小费数据
 * - 基于竞争强度和利润的动态计算
 * - 历史成功率学习和自适应调整
 */
import { JitoTipData, CapitalSize, CompetitionMetrics, BundleResult } from './types';
/**
 * Jito 小费优化器配置
 */
export interface JitoTipOptimizerConfig {
    /** Jito API 基础 URL */
    jitoApiBaseUrl?: string;
    /** 小费数据缓存时间（毫秒） */
    cacheDuration?: number;
    /** 历史数据保留数量 */
    historySize?: number;
}
/**
 * Jito 小费优化器
 */
export declare class JitoTipOptimizer {
    private static readonly DEFAULT_API_URL;
    private static readonly DEFAULT_CACHE_DURATION;
    private static readonly DEFAULT_HISTORY_SIZE;
    private readonly apiUrl;
    private readonly cacheDuration;
    private readonly historySize;
    private cachedTipData;
    private lastFetchTime;
    private bundleHistory;
    constructor(config?: JitoTipOptimizerConfig);
    /**
     * 从 Jito API 获取实时小费数据
     * @param forceRefresh 强制刷新缓存
     * @returns 小费数据
     */
    fetchRealtimeTipFloor(forceRefresh?: boolean): Promise<JitoTipData>;
    /**
     * 获取特定百分位的小费
     * @param percentile 百分位（25, 50, 75, 95, 99）
     * @returns 小费金额（lamports）
     */
    getTipAtPercentile(percentile: 25 | 50 | 75 | 95 | 99): Promise<number>;
    /**
     * 计算竞争强度评分
     * @param metrics 竞争指标
     * @returns 竞争评分（0-1）
     */
    calculateCompetitionScore(metrics: CompetitionMetrics): number;
    /**
     * 动态计算最优小费
     * @param expectedProfit 预期利润（lamports）
     * @param competition 竞争强度（0-1）
     * @param urgency 紧迫性（0-1，价差是否快速缩小）
     * @param capitalSize 资金量级
     * @returns 最优小费（lamports）
     */
    calculateOptimalTip(expectedProfit: number, competition: number, urgency: number, capitalSize: CapitalSize): Promise<number>;
    /**
     * 记录 Bundle 执行结果
     * @param result Bundle 结果
     */
    recordBundleResult(result: BundleResult): void;
    /**
     * 基于历史数据推荐小费
     * @param tokenPair 交易对
     * @param desiredSuccessRate 期望成功率（0-1）
     * @returns 推荐小费（lamports）
     */
    getRecommendedTip(tokenPair: string, desiredSuccessRate?: number): Promise<number>;
    /**
     * 获取历史统计
     * @param tokenPair 交易对（可选）
     * @returns 统计数据
     */
    getHistoryStats(tokenPair?: string): {
        totalBundles: number;
        successRate: number;
        avgTip: number;
        avgSuccessTip: number;
        avgFailedTip: number;
    };
    /**
     * 清空历史数据
     * @param tokenPair 交易对（可选，不指定则清空全部）
     */
    clearHistory(tokenPair?: string): void;
    /**
     * 获取后备小费数据（网络故障时使用）
     */
    private getFallbackTipData;
    /**
     * 根据资金量级获取推荐的百分位
     * @param capitalSize 资金量级
     * @returns 百分位
     */
    static getRecommendedPercentile(capitalSize: CapitalSize): 25 | 50 | 75 | 95 | 99;
}
//# sourceMappingURL=jito-tip-optimizer.d.ts.map