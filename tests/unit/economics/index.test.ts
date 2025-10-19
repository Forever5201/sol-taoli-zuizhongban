/**
 * Economics Module Index 测试
 * 测试工厂函数和导出
 */

import {
  createEconomicsSystem,
  JitoTipOptimizer,
  ProfitAnalyzer,
  RiskManager,
  CircuitBreaker,
  VERSION,
  METADATA,
} from '../../../packages/core/src/economics/index';
import { CostCalculator } from '../../../packages/core/src/economics/cost-calculator';

describe('Economics Module', () => {
  describe('createEconomicsSystem', () => {
    it('应该创建完整的经济系统', () => {
      const system = createEconomicsSystem({
        circuitBreaker: {
          maxConsecutiveFailures: 5,
          maxHourlyLoss: 1_000_000_000,
          minSuccessRate: 0.3,
        },
      });

      expect(system).toBeDefined();
      expect(system.costCalculator).toBe(CostCalculator); // Static class
      expect(system.profitAnalyzer).toBeInstanceOf(ProfitAnalyzer);
      expect(system.riskManager).toBeInstanceOf(RiskManager);
      expect(system.circuitBreaker).toBeInstanceOf(CircuitBreaker);
      expect(system.jitoTipOptimizer).toBeInstanceOf(JitoTipOptimizer);
    });

    it('应该使用自定义配置', () => {
      const customJitoApi = 'https://custom-jito-api.com';
      const system = createEconomicsSystem({
        jitoApi: customJitoApi,
        slippageBuffer: 1.5,
        circuitBreaker: {
          maxConsecutiveFailures: 3,
          maxHourlyLoss: 500_000_000,
          minSuccessRate: 0.5,
        },
      });

      expect(system).toBeDefined();
      expect(system.jitoTipOptimizer).toBeDefined();
    });

    it('应该使用默认配置', () => {
      const system = createEconomicsSystem({
        circuitBreaker: {
          maxConsecutiveFailures: 5,
          maxHourlyLoss: 1_000_000_000,
          minSuccessRate: 0.3,
        },
      });

      expect(system.profitAnalyzer).toBeDefined();
      expect(system.costCalculator).toBeDefined();
    });
  });

  describe('Module Exports', () => {
    it('应该导出所有核心类', () => {
      expect(CostCalculator).toBeDefined();
      expect(CircuitBreaker).toBeDefined();
      expect(ProfitAnalyzer).toBeDefined();
      expect(RiskManager).toBeDefined();
      expect(JitoTipOptimizer).toBeDefined();
    });

    it('应该导出版本信息', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('应该导出元数据', () => {
      expect(METADATA).toBeDefined();
      expect(METADATA.name).toBe('Solana Arbitrage Economics');
      expect(METADATA.version).toBe(VERSION);
      expect(METADATA.description).toContain('Solana');
    });
  });

  describe('System Integration', () => {
    it('系统组件应该能协同工作', () => {
      const system = createEconomicsSystem({
        circuitBreaker: {
          maxConsecutiveFailures: 5,
          maxHourlyLoss: 1_000_000_000,
          minSuccessRate: 0.3,
        },
      });

      // 测试组件间集成
      const costs = CostCalculator.calculateTotalCost(
        {
          signatureCount: 2,
          computeUnits: 300_000,
          computeUnitPrice: 50,
          useFlashLoan: false,
        },
        10_000
      );

      expect(costs).toBeDefined();
      expect(costs.total).toBeGreaterThan(0);
    });

    it('应该支持链式操作', async () => {
      const system = createEconomicsSystem({
        circuitBreaker: {
          maxConsecutiveFailures: 5,
          maxHourlyLoss: 1_000_000_000,
          minSuccessRate: 0.3,
        },
      });

      // 成本计算 -> 利润分析 -> 风险检查
      expect(system.costCalculator).toBeDefined();
      expect(system.profitAnalyzer).toBeDefined();
      expect(system.riskManager).toBeDefined();
    });
  });
});
