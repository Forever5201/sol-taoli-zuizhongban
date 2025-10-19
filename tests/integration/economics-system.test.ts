/**
 * 经济系统集成测试
 * 测试所有经济模块的协同工作
 */

import { createEconomicsSystem } from '../../packages/core/src/economics';
import {
  MOCK_MEDIUM_OPPORTUNITY,
  MOCK_COST_CONFIG,
  MOCK_CONSERVATIVE_RISK_CONFIG,
  MOCK_CIRCUIT_BREAKER_CONFIG,
} from '../helpers/mock-data';
import { mockFetch } from '../helpers/test-utils';

describe('经济系统集成测试', () => {
  beforeEach(() => {
    // Mock Jito API
    mockFetch({
      time: new Date().toISOString(),
      landed_tips_50th_percentile: 0.00001,
      landed_tips_75th_percentile: 0.000025,
      landed_tips_95th_percentile: 0.0001,
    });
  });

  describe('完整决策流程', () => {
    it('应该完成端到端的机会评估', async () => {
      const economics = createEconomicsSystem({
        riskConfig: MOCK_CONSERVATIVE_RISK_CONFIG,
        circuitBreakerConfig: MOCK_CIRCUIT_BREAKER_CONFIG,
      });

      const opportunity = MOCK_MEDIUM_OPPORTUNITY;

      // 1. 验证机会
      const validation = economics.riskManager.validateOpportunity(opportunity);
      expect(validation.isValid).toBe(true);

      // 2. 计算最优小费
      const jitoTip = await economics.jitoTipOptimizer.calculateOptimalTip(
        opportunity.grossProfit,
        0.5,
        0.5,
        'medium'
      );
      expect(jitoTip).toBeGreaterThan(0);

      // 3. 计算成本
      const costs = economics.costCalculator.calculateTotalCost(
        MOCK_COST_CONFIG,
        jitoTip
      );
      expect(costs.total).toBeGreaterThan(0);

      // 4. 分析利润
      const analysis = economics.profitAnalyzer.analyzeProfitability(
        opportunity,
        MOCK_COST_CONFIG,
        jitoTip
      );
      expect(analysis).toBeDefined();

      // 5. 风险检查
      const riskCheck = economics.riskManager.preExecutionCheck(
        opportunity,
        analysis
      );
      expect(riskCheck.passed).toBeDefined();

      // 6. 熔断器检查
      const canAttempt = economics.circuitBreaker.canAttempt();
      expect(canAttempt).toBe(true);
    });

    it('应该拒绝不盈利的机会', async () => {
      const economics = createEconomicsSystem({
        riskConfig: MOCK_CONSERVATIVE_RISK_CONFIG,
        circuitBreakerConfig: MOCK_CIRCUIT_BREAKER_CONFIG,
      });

      const badOpportunity = {
        ...MOCK_MEDIUM_OPPORTUNITY,
        grossProfit: 1000, // 非常低的利润
      };

      const validation = economics.riskManager.validateOpportunity(badOpportunity);
      expect(validation.isValid).toBe(false);
    });

    it('熔断器应该阻止连续失败后的交易', () => {
      const economics = createEconomicsSystem({
        riskConfig: MOCK_CONSERVATIVE_RISK_CONFIG,
        circuitBreakerConfig: MOCK_CIRCUIT_BREAKER_CONFIG,
      });

      // 记录多次失败
      for (let i = 0; i < 5; i++) {
        economics.circuitBreaker.recordTransaction({
          success: false,
          cost: 50_000,
          timestamp: Date.now(),
        });
      }

      const canAttempt = economics.circuitBreaker.canAttempt();
      expect(canAttempt).toBe(false);
    });
  });

  describe('性能测试', () => {
    it('应该能够快速处理机会评估', async () => {
      const economics = createEconomicsSystem({
        riskConfig: MOCK_CONSERVATIVE_RISK_CONFIG,
        circuitBreakerConfig: MOCK_CIRCUIT_BREAKER_CONFIG,
      });

      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        const validation = economics.riskManager.validateOpportunity(
          MOCK_MEDIUM_OPPORTUNITY
        );
      }

      const duration = Date.now() - start;

      // 100次验证应该在100ms内完成
      expect(duration).toBeLessThan(100);
    });

    it('批量分析应该高效', async () => {
      const economics = createEconomicsSystem({
        riskConfig: MOCK_CONSERVATIVE_RISK_CONFIG,
        circuitBreakerConfig: MOCK_CIRCUIT_BREAKER_CONFIG,
      });

      const opportunities = Array(50).fill(MOCK_MEDIUM_OPPORTUNITY);

      const start = Date.now();

      const analyses = opportunities.map(opp =>
        economics.profitAnalyzer.analyzeProfitability(
          opp,
          MOCK_COST_CONFIG,
          10_000
        )
      );

      const duration = Date.now() - start;

      expect(analyses.length).toBe(50);
      // 50次分析应该在50ms内完成
      expect(duration).toBeLessThan(50);
    });
  });

  describe('状态管理', () => {
    it('应该正确维护状态', () => {
      const economics = createEconomicsSystem({
        riskConfig: MOCK_CONSERVATIVE_RISK_CONFIG,
        circuitBreakerConfig: MOCK_CIRCUIT_BREAKER_CONFIG,
      });

      // 记录交易
      economics.circuitBreaker.recordTransaction({
        success: true,
        profit: 1_000_000,
        timestamp: Date.now(),
      });

      const metrics = economics.circuitBreaker.getMetrics();
      expect(metrics.successCount).toBe(1);
      expect(metrics.totalAttempts).toBe(1);
    });

    it('应该能够重置状态', () => {
      const economics = createEconomicsSystem({
        riskConfig: MOCK_CONSERVATIVE_RISK_CONFIG,
        circuitBreakerConfig: MOCK_CIRCUIT_BREAKER_CONFIG,
      });

      economics.circuitBreaker.recordTransaction({
        success: true,
        profit: 1_000_000,
        timestamp: Date.now(),
      });

      economics.circuitBreaker.reset();

      const metrics = economics.circuitBreaker.getMetrics();
      expect(metrics.totalAttempts).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该优雅处理API失败', async () => {
      // Mock失败的API
      mockFetch({}, 500);

      const economics = createEconomicsSystem({
        riskConfig: MOCK_CONSERVATIVE_RISK_CONFIG,
        circuitBreakerConfig: MOCK_CIRCUIT_BREAKER_CONFIG,
      });

      // 应该使用降级值，不应该抛出错误
      const tip = await economics.jitoTipOptimizer.calculateOptimalTip(
        1_000_000,
        0.5,
        0.5,
        'medium'
      );

      expect(tip).toBeGreaterThan(0);
    });

    it('应该处理无效输入', () => {
      const economics = createEconomicsSystem({
        riskConfig: MOCK_CONSERVATIVE_RISK_CONFIG,
        circuitBreakerConfig: MOCK_CIRCUIT_BREAKER_CONFIG,
      });

      const invalidOpp = {
        ...MOCK_MEDIUM_OPPORTUNITY,
        grossProfit: -1000, // 无效利润
      };

      const validation = economics.riskManager.validateOpportunity(invalidOpp);
      expect(validation.isValid).toBe(false);
    });
  });
});
