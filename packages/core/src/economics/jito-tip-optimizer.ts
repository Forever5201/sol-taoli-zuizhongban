/**
 * Jito 小费优化器
 * 
 * 实现智能的动态出价策略，包括：
 * - 实时获取 Jito 市场小费数据
 * - 基于竞争强度和利润的动态计算
 * - 历史成功率学习和自适应调整
 */

import axios from 'axios';
import {
  JitoTipData,
  CapitalSize,
  CompetitionMetrics,
  BundleResult,
  LAMPORTS_PER_SOL,
} from './types';
import { getAxiosProxyConfig } from '../config/proxy-config';

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
  /** 最小小费（lamports） */
  minTipLamports?: number;
  /** 最大小费（lamports） */
  maxTipLamports?: number;
  /** 利润分成比例（0-1，默认 0.30 = 30%） */
  profitSharePercentage?: number;
  /** 竞争强度倍数（默认 2.5） */
  competitionMultiplier?: number;
  /** 紧迫性倍数（默认 1.8） */
  urgencyMultiplier?: number;
  /** 是否使用历史学习（默认 true） */
  useHistoricalLearning?: boolean;
  /** 历史数据权重（0-1，默认 0.4 = 40%） */
  historicalWeight?: number;
}

/**
 * Jito 小费优化器
 */
export class JitoTipOptimizer {
  private static readonly DEFAULT_API_URL = 'https://bundles.jito.wtf/api/v1/bundles';
  private static readonly DEFAULT_CACHE_DURATION = 10_000; // 10 seconds
  private static readonly DEFAULT_HISTORY_SIZE = 100;
  private static readonly DEFAULT_MIN_TIP = 1_000; // 0.000001 SOL
  private static readonly DEFAULT_MAX_TIP = 100_000_000; // 0.1 SOL
  private static readonly DEFAULT_PROFIT_SHARE = 0.30; // 30%
  private static readonly DEFAULT_COMPETITION_MULTIPLIER = 2.5;
  private static readonly DEFAULT_URGENCY_MULTIPLIER = 1.8;
  private static readonly DEFAULT_HISTORICAL_WEIGHT = 0.4; // 40%

  private readonly apiUrl: string;
  private readonly cacheDuration: number;
  private readonly historySize: number;
  private readonly minTipLamports: number;
  private readonly maxTipLamports: number;
  private readonly profitSharePercentage: number;
  private readonly competitionMultiplier: number;
  private readonly urgencyMultiplier: number;
  private readonly useHistoricalLearning: boolean;
  private readonly historicalWeight: number;

  // 缓存的小费数据
  private cachedTipData: JitoTipData | null = null;
  private lastFetchTime = 0;

  // 历史 Bundle 结果（按交易对分类）
  private bundleHistory: Map<string, BundleResult[]> = new Map();

  constructor(config: JitoTipOptimizerConfig = {}) {
    this.apiUrl = config.jitoApiBaseUrl || JitoTipOptimizer.DEFAULT_API_URL;
    this.cacheDuration = config.cacheDuration || JitoTipOptimizer.DEFAULT_CACHE_DURATION;
    this.historySize = config.historySize || JitoTipOptimizer.DEFAULT_HISTORY_SIZE;
    this.minTipLamports = config.minTipLamports ?? JitoTipOptimizer.DEFAULT_MIN_TIP;
    this.maxTipLamports = config.maxTipLamports ?? JitoTipOptimizer.DEFAULT_MAX_TIP;
    this.profitSharePercentage = config.profitSharePercentage ?? JitoTipOptimizer.DEFAULT_PROFIT_SHARE;
    this.competitionMultiplier = config.competitionMultiplier ?? JitoTipOptimizer.DEFAULT_COMPETITION_MULTIPLIER;
    this.urgencyMultiplier = config.urgencyMultiplier ?? JitoTipOptimizer.DEFAULT_URGENCY_MULTIPLIER;
    this.useHistoricalLearning = config.useHistoricalLearning !== false;
    this.historicalWeight = config.historicalWeight ?? JitoTipOptimizer.DEFAULT_HISTORICAL_WEIGHT;
  }

  /**
   * 从 Jito API 获取实时小费数据
   * @param forceRefresh 强制刷新缓存
   * @returns 小费数据
   */
  async fetchRealtimeTipFloor(forceRefresh = false): Promise<JitoTipData> {
    const now = Date.now();

    // 检查缓存
    if (
      !forceRefresh &&
      this.cachedTipData &&
      now - this.lastFetchTime < this.cacheDuration
    ) {
      return this.cachedTipData;
    }

    try {
      const response = await axios.get<JitoTipData[]>(
        `${this.apiUrl}/tip_floor`,
        {
          timeout: 5000,
          ...getAxiosProxyConfig(this.apiUrl),
        }
      );

      if (response.data && response.data.length > 0) {
        this.cachedTipData = response.data[0];
        this.lastFetchTime = now;
        return this.cachedTipData;
      }

      throw new Error('Empty tip data received');
    } catch (error) {
      // 网络错误：使用缓存或默认值
      if (this.cachedTipData) {
        console.warn('Failed to fetch Jito tip data, using cached data', error);
        return this.cachedTipData;
      }

      // 返回保守的默认值
      console.error('Failed to fetch Jito tip data, using fallback', error);
      return this.getFallbackTipData();
    }
  }

  /**
   * 获取特定百分位的小费
   * @param percentile 百分位（25, 50, 75, 95, 99）
   * @returns 小费金额（lamports）
   */
  async getTipAtPercentile(percentile: 25 | 50 | 75 | 95 | 99): Promise<number> {
    const tipData = await this.fetchRealtimeTipFloor();

    const tipInSOL = (() => {
      switch (percentile) {
        case 25:
          return tipData.landed_tips_25th_percentile;
        case 50:
          return tipData.landed_tips_50th_percentile;
        case 75:
          return tipData.landed_tips_75th_percentile;
        case 95:
          return tipData.landed_tips_95th_percentile;
        case 99:
          return tipData.landed_tips_99th_percentile;
        default:
          return tipData.landed_tips_50th_percentile;
      }
    })();

    return Math.ceil(tipInSOL * LAMPORTS_PER_SOL);
  }

  /**
   * 计算竞争强度评分
   * @param metrics 竞争指标
   * @returns 竞争评分（0-1）
   */
  calculateCompetitionScore(metrics: CompetitionMetrics): number {
    // 标准化各指标（0-1）
    const volumeScore = Math.min(metrics.tokenPairVolume / 10_000_000, 1);
    const arbFrequencyScore = Math.min(metrics.historicalArbCount / 100, 1);
    const tipScore = Math.min(metrics.averageTipLast10min / 100_000, 1);
    const failureScore = metrics.failedBundleRate;

    // 加权平均
    return (
      volumeScore * 0.3 +
      arbFrequencyScore * 0.3 +
      tipScore * 0.2 +
      failureScore * 0.2
    );
  }

  /**
   * 动态计算最优小费（优化版 - 激进策略）
   * @param expectedProfit 预期利润（lamports）
   * @param competition 竞争强度（0-1）
   * @param urgency 紧迫性（0-1，价差是否快速缩小）
   * @param capitalSize 资金量级
   * @param tokenPair 交易对（用于历史学习）
   * @returns 最优小费（lamports）
   */
  async calculateOptimalTip(
    expectedProfit: number,
    competition: number,
    urgency: number,
    capitalSize: CapitalSize,
    tokenPair: string = 'UNKNOWN'
  ): Promise<number> {
    // 1. 获取基础小费（50th percentile）
    const baseTip = await this.getTipAtPercentile(50);

    // 2. 利润分成：使用可配置的百分比（激进策略）
    const profitBasedTip = expectedProfit * this.profitSharePercentage;

    // 3. 竞争调整：使用指数函数，更激进
    // competitionMultiplier = 2.5 时：
    // - competition = 0.5 -> boost = 1.87x
    // - competition = 0.8 -> boost = 2.89x
    // - competition = 1.0 -> boost = 5.66x
    const competitionBoost = Math.pow(1 + competition, this.competitionMultiplier);

    // 4. 紧迫性调整：线性提升
    const urgencyBoost = 1 + urgency * this.urgencyMultiplier;

    // 5. 实时计算的 tip
    const realtimeTip = baseTip * competitionBoost * urgencyBoost;

    // 6. 历史学习：融合历史成功率数据
    let finalTip = realtimeTip;
    if (this.useHistoricalLearning) {
      try {
        const historicalTip = await this.getRecommendedTip(tokenPair, 0.75);
        if (historicalTip > 0) {
          // 融合实时和历史 tip（加权平均）
          finalTip = realtimeTip * (1 - this.historicalWeight) + historicalTip * this.historicalWeight;
        }
      } catch (error) {
        // 历史学习失败，仅使用实时 tip
        console.debug(`Historical learning failed for ${tokenPair}:`, error);
      }
    }

    // 7. 应用利润上限（确保盈利）
    const cappedTip = Math.min(finalTip, profitBasedTip);

    // 8. 应用配置的 min/max
    return Math.max(this.minTipLamports, Math.min(cappedTip, this.maxTipLamports));
  }

  /**
   * 记录 Bundle 执行结果
   * @param result Bundle 结果
   */
  recordBundleResult(result: BundleResult): void {
    const { tokenPair } = result;

    if (!this.bundleHistory.has(tokenPair)) {
      this.bundleHistory.set(tokenPair, []);
    }

    const history = this.bundleHistory.get(tokenPair)!;
    history.push(result);

    // 限制历史大小
    if (history.length > this.historySize) {
      history.shift();
    }
  }

  /**
   * 基于历史数据推荐小费（改进版 - 时间衰减 + 分桶统计）
   * @param tokenPair 交易对
   * @param desiredSuccessRate 期望成功率（0-1，默认 75%）
   * @returns 推荐小费（lamports）
   */
  async getRecommendedTip(
    tokenPair: string,
    desiredSuccessRate: number = 0.75
  ): Promise<number> {
    const history = this.bundleHistory.get(tokenPair) || [];

    if (history.length < 10) {
      // 数据不足，使用激进策略（95th percentile）
      return this.getTipAtPercentile(95);
    }

    // 应用时间衰减权重（最近的数据权重更高）
    const now = Date.now();
    const DECAY_HALF_LIFE = 24 * 3600_000; // 24小时衰减到一半
    const weightedHistory = history.map(result => ({
      ...result,
      weight: Math.exp(-(now - result.timestamp) / DECAY_HALF_LIFE),
    }));

    // 按 tip 分桶，计算加权成功率
    // 每个桶代表 0.0001 SOL (100,000 lamports)
    const TIP_BUCKET_SIZE = 100_000;
    const tipBuckets = new Map<number, { successes: number; total: number }>();

    for (const result of weightedHistory) {
      const tipBucket = Math.floor(result.tip / TIP_BUCKET_SIZE) * TIP_BUCKET_SIZE;
      if (!tipBuckets.has(tipBucket)) {
        tipBuckets.set(tipBucket, { successes: 0, total: 0 });
      }
      const bucket = tipBuckets.get(tipBucket)!;
      bucket.total += result.weight;
      if (result.success) {
        bucket.successes += result.weight;
      }
    }

    // 找到达到目标成功率的最低 tip
    const sortedBuckets = Array.from(tipBuckets.entries())
      .sort((a, b) => a[0] - b[0]);

    for (const [tipAmount, stats] of sortedBuckets) {
      const successRate = stats.successes / stats.total;
      if (successRate >= desiredSuccessRate && stats.total >= 2) {
        // 至少需要 2 个加权样本
        return tipAmount;
      }
    }

    // 未达到目标成功率，返回最高 tip 的 1.5 倍（更激进）
    if (sortedBuckets.length > 0) {
      const maxTip = sortedBuckets[sortedBuckets.length - 1][0];
      return Math.ceil(maxTip * 1.5);
    }

    // 完全没有历史数据，降级到实时 API
    return this.getTipAtPercentile(95);
  }

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
  } {
    let bundles: BundleResult[];

    if (tokenPair) {
      bundles = this.bundleHistory.get(tokenPair) || [];
    } else {
      bundles = Array.from(this.bundleHistory.values()).flat();
    }

    if (bundles.length === 0) {
      return {
        totalBundles: 0,
        successRate: 0,
        avgTip: 0,
        avgSuccessTip: 0,
        avgFailedTip: 0,
      };
    }

    const successful = bundles.filter((b) => b.success);
    const failed = bundles.filter((b) => !b.success);

    const avgTip = bundles.reduce((sum, b) => sum + b.tip, 0) / bundles.length;
    const avgSuccessTip = successful.length > 0
      ? successful.reduce((sum, b) => sum + b.tip, 0) / successful.length
      : 0;
    const avgFailedTip = failed.length > 0
      ? failed.reduce((sum, b) => sum + b.tip, 0) / failed.length
      : 0;

    return {
      totalBundles: bundles.length,
      successRate: successful.length / bundles.length,
      avgTip,
      avgSuccessTip,
      avgFailedTip,
    };
  }

  /**
   * 清空历史数据
   * @param tokenPair 交易对（可选，不指定则清空全部）
   */
  clearHistory(tokenPair?: string): void {
    if (tokenPair) {
      this.bundleHistory.delete(tokenPair);
    } else {
      this.bundleHistory.clear();
    }
  }

  /**
   * 获取后备小费数据（网络故障时使用）
   */
  private getFallbackTipData(): JitoTipData {
    return {
      time: new Date().toISOString(),
      landed_tips_25th_percentile: 0.000006,
      landed_tips_50th_percentile: 0.00001,
      landed_tips_75th_percentile: 0.000036,
      landed_tips_95th_percentile: 0.0014,
      landed_tips_99th_percentile: 0.01,
      ema_landed_tips_50th_percentile: 0.00001,
    };
  }

  /**
   * 根据资金量级获取推荐的百分位
   * @param capitalSize 资金量级
   * @returns 百分位
   */
  static getRecommendedPercentile(capitalSize: CapitalSize): 25 | 50 | 75 | 95 | 99 {
    switch (capitalSize) {
      case 'small':
        return 50; // 小资金使用 50th，控制成本
      case 'medium':
        return 75; // 中等资金使用 75th，平衡成本和成功率
      case 'large':
        return 95; // 大资金使用 95th，追求高成功率
    }
  }
}



