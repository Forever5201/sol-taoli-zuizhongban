/**
 * JitoTipOptimizer 单元测试（修复版）
 */

import { JitoTipOptimizer } from '../../../packages/core/src/economics/jito-tip-optimizer';
import { MOCK_JITO_TIP_DATA } from '../../helpers/mock-data';
import type { BundleResult } from '../../../packages/core/src/economics/types';

// Mock axios module
jest.mock('axios', () => ({
  default: {
    get: jest.fn(),
  },
  get: jest.fn(),
}));

const axios = require('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JitoTipOptimizer', () => {
  let optimizer: JitoTipOptimizer;

  beforeEach(() => {
    optimizer = new JitoTipOptimizer();
    // Mock axios for API calls
    mockedAxios.get.mockResolvedValue({
      data: [MOCK_JITO_TIP_DATA],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRealtimeTipFloor', () => {
    it('应该成功获取小费数据', async () => {
      const data = await optimizer.fetchRealtimeTipFloor();

      expect(data).toBeDefined();
      expect(data.landed_tips_50th_percentile).toBeGreaterThan(0);
    });

    it('应该使用缓存', async () => {
      const data1 = await optimizer.fetchRealtimeTipFloor();
      const data2 = await optimizer.fetchRealtimeTipFloor();

      expect(data1).toEqual(data2);
    });

    it('API失败应该使用降级值', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      const newOptimizer = new JitoTipOptimizer();
      
      const data = await newOptimizer.fetchRealtimeTipFloor();

      expect(data).toBeDefined();
      expect(data.landed_tips_50th_percentile).toBeGreaterThan(0);
    });
  });

  describe('calculateOptimalTip', () => {
    it('应该计算合理的小费', async () => {
      const expectedProfit = 1_000_000;
      const competitionLevel = 0.5;
      const urgency = 0.5;

      const tip = await optimizer.calculateOptimalTip(
        expectedProfit,
        competitionLevel,
        urgency,
        'medium'
      );

      expect(tip).toBeGreaterThan(0);
      expect(tip).toBeLessThan(expectedProfit);
    });

    it('高竞争应该推荐更高小费', async () => {
      const expectedProfit = 5_000_000;

      const lowCompTip = await optimizer.calculateOptimalTip(
        expectedProfit,
        0.2,
        0.5,
        'medium'
      );

      const highCompTip = await optimizer.calculateOptimalTip(
        expectedProfit,
        0.9,
        0.5,
        'medium'
      );

      expect(highCompTip).toBeGreaterThan(lowCompTip);
    });

    it('高紧迫性应该推荐更高小费', async () => {
      const expectedProfit = 5_000_000;

      const lowUrgencyTip = await optimizer.calculateOptimalTip(
        expectedProfit,
        0.5,
        0.2,
        'medium'
      );

      const highUrgencyTip = await optimizer.calculateOptimalTip(
        expectedProfit,
        0.5,
        0.9,
        'medium'
      );

      expect(highUrgencyTip).toBeGreaterThan(lowUrgencyTip);
    });

    it('应该处理零利润', async () => {
      const tip = await optimizer.calculateOptimalTip(0, 0.5, 0.5, 'medium');
      expect(tip).toBeGreaterThanOrEqual(0); // 可能返回基础小费
    });

    it('应该处理极大利润', async () => {
      const tip = await optimizer.calculateOptimalTip(
        1_000_000_000_000,
        0.5,
        0.5,
        'large'
      );

      expect(tip).toBeGreaterThan(0);
      expect(Number.isFinite(tip)).toBe(true);
    });
  });

  describe('recordBundleResult', () => {
    it('应该记录成功的bundle', () => {
      const result: BundleResult = {
        bundleId: 'test-bundle-1',
        success: true,
        tip: 50_000,
        profit: 1_000_000,
        tokenPair: 'SOL/USDC',
        timestamp: Date.now(),
      };

      optimizer.recordBundleResult(result);

      const stats = optimizer.getHistoryStats('SOL/USDC');
      expect(stats.totalBundles).toBeGreaterThan(0);
    });

    it('应该记录失败的bundle', () => {
      const result: BundleResult = {
        bundleId: 'test-bundle-2',
        success: false,
        tip: 50_000,
        tokenPair: 'SOL/USDC',
        timestamp: Date.now(),
      };

      optimizer.recordBundleResult(result);

      const stats = optimizer.getHistoryStats('SOL/USDC');
      expect(stats.totalBundles).toBeGreaterThan(0);
    });

    it('应该按交易对分类', () => {
      const newOptimizer = new JitoTipOptimizer();
      
      const result1: BundleResult = {
        bundleId: 'bundle-1',
        success: true,
        tip: 50_000,
        profit: 500_000,
        tokenPair: 'SOL/USDC',
        timestamp: Date.now(),
      };

      const result2: BundleResult = {
        bundleId: 'bundle-2',
        success: true,
        tip: 30_000,
        profit: 300_000,
        tokenPair: 'SOL/USDT',
        timestamp: Date.now(),
      };

      newOptimizer.recordBundleResult(result1);
      newOptimizer.recordBundleResult(result2);

      const solUsdcStats = newOptimizer.getHistoryStats('SOL/USDC');
      const solUsdtStats = newOptimizer.getHistoryStats('SOL/USDT');

      expect(solUsdcStats.totalBundles).toBe(1);
      expect(solUsdtStats.totalBundles).toBe(1);
    });
  });

  describe('getHistoryStats', () => {
    it('应该计算成功率', () => {
      const testOptimizer = new JitoTipOptimizer();
      
      for (let i = 0; i < 7; i++) {
        testOptimizer.recordBundleResult({
          bundleId: `success-${i}`,
          success: true,
          tip: 50_000,
          profit: 500_000,
          tokenPair: 'SOL/USDC',
          timestamp: Date.now(),
        });
      }

      for (let i = 0; i < 3; i++) {
        testOptimizer.recordBundleResult({
          bundleId: `fail-${i}`,
          success: false,
          tip: 50_000,
          tokenPair: 'SOL/USDC',
          timestamp: Date.now(),
        });
      }

      const stats = testOptimizer.getHistoryStats('SOL/USDC');
      expect(stats.successRate).toBeCloseTo(0.7, 2);
      expect(stats.totalBundles).toBe(10);
    });

    it('无历史应该返回空统计', () => {
      const stats = optimizer.getHistoryStats('UNKNOWN/PAIR');
      expect(stats.totalBundles).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('应该计算平均小费', () => {
      const testOptimizer = new JitoTipOptimizer();
      
      testOptimizer.recordBundleResult({
        bundleId: 'b1',
        success: true,
        tip: 100_000,
        profit: 1_000_000,
        tokenPair: 'SOL/USDC',
        timestamp: Date.now(),
      });

      testOptimizer.recordBundleResult({
        bundleId: 'b2',
        success: true,
        tip: 200_000,
        profit: 2_000_000,
        tokenPair: 'SOL/USDC',
        timestamp: Date.now(),
      });

      const stats = testOptimizer.getHistoryStats('SOL/USDC');
      expect(stats.avgTip).toBe(150_000);
    });
  });


  describe('getTipAtPercentile', () => {
    it('应该获取50th百分位小费', async () => {
      const tip = await optimizer.getTipAtPercentile(50);
      expect(tip).toBeGreaterThan(0);
      expect(Number.isFinite(tip)).toBe(true);
    });

    it('应该获取25th百分位小费', async () => {
      const tip = await optimizer.getTipAtPercentile(25);
      expect(tip).toBeGreaterThan(0);
    });

    it('应该获取75th百分位小费', async () => {
      const tip75 = await optimizer.getTipAtPercentile(75);
      const tip50 = await optimizer.getTipAtPercentile(50);
      expect(tip75).toBeGreaterThanOrEqual(tip50);
    });

    it('应该获取95th百分位小费', async () => {
      const tip95 = await optimizer.getTipAtPercentile(95);
      const tip75 = await optimizer.getTipAtPercentile(75);
      expect(tip95).toBeGreaterThanOrEqual(tip75);
    });

    it('应该获取99th百分位小费', async () => {
      const tip99 = await optimizer.getTipAtPercentile(99);
      const tip95 = await optimizer.getTipAtPercentile(95);
      expect(tip99).toBeGreaterThanOrEqual(tip95);
    });
  });

  describe('calculateCompetitionScore', () => {
    it('应该计算基本竞争评分', () => {
      const metrics = {
        tokenPairVolume: 5_000_000,
        historicalArbCount: 50,
        averageTipLast10min: 50_000,
        failedBundleRate: 0.3,
      };

      const score = optimizer.calculateCompetitionScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('低竞争应该得分低', () => {
      const lowMetrics = {
        tokenPairVolume: 100_000,
        historicalArbCount: 5,
        averageTipLast10min: 5_000,
        failedBundleRate: 0.1,
      };

      const score = optimizer.calculateCompetitionScore(lowMetrics);
      expect(score).toBeLessThan(0.3);
    });

    it('高竞争应该得分高', () => {
      const highMetrics = {
        tokenPairVolume: 50_000_000,
        historicalArbCount: 200,
        averageTipLast10min: 200_000,
        failedBundleRate: 0.8,
      };

      const score = optimizer.calculateCompetitionScore(highMetrics);
      expect(score).toBeGreaterThan(0.7);
    });

    it('应该正确加权各指标', () => {
      const metrics = {
        tokenPairVolume: 10_000_000, // 100% of threshold
        historicalArbCount: 100,      // 100% of threshold
        averageTipLast10min: 100_000, // 100% of threshold
        failedBundleRate: 1.0,        // 100%
      };

      const score = optimizer.calculateCompetitionScore(metrics);
      expect(score).toBeCloseTo(1.0, 1);
    });
  });

  describe('getRecommendedTip', () => {
    it('数据不足应该使用保守策略', async () => {
      const newOptimizer = new JitoTipOptimizer();
      // axios already mocked in beforeEach
      
      const tip = await newOptimizer.getRecommendedTip('NEW/PAIR', 0.7);
      expect(tip).toBeGreaterThan(0);
    });

    it('应该基于历史推荐小费', async () => {
      const testOptimizer = new JitoTipOptimizer();
      // axios already mocked in beforeEach
      
      // 记录足够的历史数据
      for (let i = 0; i < 15; i++) {
        testOptimizer.recordBundleResult({
          bundleId: `bundle-${i}`,
          success: i >= 5, // 前5个失败，后10个成功
          tip: 50_000 + i * 10_000,
          profit: i >= 5 ? 500_000 : undefined,
          tokenPair: 'SOL/USDC',
          timestamp: Date.now(),
        });
      }

      const tip = await testOptimizer.getRecommendedTip('SOL/USDC', 0.7);
      expect(tip).toBeGreaterThan(0);
    });
  });

  describe('资金规模策略', () => {
    it('小资金策略应该更保守', async () => {
      const expectedProfit = 500_000;

      const smallTip = await optimizer.calculateOptimalTip(
        expectedProfit,
        0.5,
        0.5,
        'small'
      );

      const mediumTip = await optimizer.calculateOptimalTip(
        expectedProfit,
        0.5,
        0.5,
        'medium'
      );

      const smallRatio = smallTip / expectedProfit;
      const mediumRatio = mediumTip / expectedProfit;

      expect(smallRatio).toBeLessThanOrEqual(mediumRatio);
    });

    it('大资金策略应该更激进', async () => {
      const expectedProfit = 10_000_000;

      const mediumTip = await optimizer.calculateOptimalTip(
        expectedProfit,
        0.5,
        0.5,
        'medium'
      );

      const largeTip = await optimizer.calculateOptimalTip(
        expectedProfit,
        0.5,
        0.5,
        'large'
      );

      expect(largeTip).toBeGreaterThanOrEqual(mediumTip);
    });
  });
});
