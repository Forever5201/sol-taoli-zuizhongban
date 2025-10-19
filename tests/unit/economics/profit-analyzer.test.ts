/**
 * ProfitAnalyzer 单元测试（修复版）
 */

import { ProfitAnalyzer } from '../../../packages/core/src/economics/profit-analyzer';
import { CostCalculator } from '../../../packages/core/src/economics/cost-calculator';
import {
  MOCK_SMALL_OPPORTUNITY,
  MOCK_MEDIUM_OPPORTUNITY,
  MOCK_LARGE_OPPORTUNITY,
  MOCK_UNPROFITABLE_OPPORTUNITY,
  MOCK_COST_CONFIG,
  MOCK_FLASHLOAN_COST_CONFIG,
} from '../../helpers/mock-data';

describe('ProfitAnalyzer', () => {
  let analyzer: ProfitAnalyzer;

  beforeEach(() => {
    analyzer = new ProfitAnalyzer();
  });

  describe('analyzeProfitability', () => {
    it('应该正确分析盈利机会', () => {
      const analysis = analyzer.analyzeProfitability(
        MOCK_MEDIUM_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );

      expect(analysis).toBeDefined();
      expect(analysis.grossProfit).toBe(MOCK_MEDIUM_OPPORTUNITY.grossProfit);
      expect(analysis.costs).toBeDefined();
      expect(analysis.isProfitable).toBeDefined();
    });

    it('应该识别不盈利的机会', () => {
      const analysis = analyzer.analyzeProfitability(
        MOCK_UNPROFITABLE_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );

      expect(analysis.isProfitable).toBe(false);
    });

    it('应该包含完整的成本明细', () => {
      const analysis = analyzer.analyzeProfitability(
        MOCK_MEDIUM_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );

      expect(analysis.costs).toHaveProperty('baseFee');
      expect(analysis.costs).toHaveProperty('priorityFee');
      expect(analysis.costs).toHaveProperty('jitoTip');
      expect(analysis.costs).toHaveProperty('total');
    });
  });

  describe('calculateGrossProfit', () => {
    it('应该返回正确的毛利润', () => {
      const grossProfit = analyzer.calculateGrossProfit(MOCK_MEDIUM_OPPORTUNITY);
      expect(grossProfit).toBe(MOCK_MEDIUM_OPPORTUNITY.grossProfit);
    });
  });

  describe('estimateSlippageImpact', () => {
    it('应该计算滑点影响', () => {
      const impact = analyzer.estimateSlippageImpact(MOCK_MEDIUM_OPPORTUNITY);
      expect(impact).toBeLessThan(0); // 滑点是负面影响
      expect(impact).toBeGreaterThan(-MOCK_MEDIUM_OPPORTUNITY.grossProfit);
    });

    it('保守估计应该有更大的滑点影响', () => {
      const conservativeAnalyzer = new ProfitAnalyzer({ conservativeEstimate: true });
      
      const normalImpact = analyzer.estimateSlippageImpact(MOCK_MEDIUM_OPPORTUNITY);
      const conservativeImpact = conservativeAnalyzer.estimateSlippageImpact(MOCK_MEDIUM_OPPORTUNITY);

      expect(Math.abs(conservativeImpact)).toBeGreaterThan(Math.abs(normalImpact));
    });
  });

  describe('calculateNetProfit', () => {
    it('应该正确计算净利润', () => {
      const costs = CostCalculator.calculateTotalCost(MOCK_COST_CONFIG, 10_000);
      const netProfit = analyzer.calculateNetProfit(MOCK_MEDIUM_OPPORTUNITY, costs);

      expect(netProfit).toBeLessThan(MOCK_MEDIUM_OPPORTUNITY.grossProfit);
      expect(Number.isFinite(netProfit)).toBe(true);
    });

    it('应该扣除成本和滑点', () => {
      const costs = CostCalculator.calculateTotalCost(MOCK_COST_CONFIG, 10_000);
      const netProfit = analyzer.calculateNetProfit(MOCK_MEDIUM_OPPORTUNITY, costs);
      const grossProfit = MOCK_MEDIUM_OPPORTUNITY.grossProfit;

      expect(netProfit).toBeLessThan(grossProfit);
    });
  });

  describe('calculateROI', () => {
    it('应该正确计算ROI', () => {
      const netProfit = 50_000;
      const totalCost = 25_000;
      const roi = analyzer.calculateROI(netProfit, totalCost);

      expect(roi).toBe(200); // (50000/25000) * 100 = 200%
    });

    it('应该处理零成本', () => {
      const roi = analyzer.calculateROI(10_000, 0);
      expect(roi).toBe(0);
    });

    it('应该处理负利润', () => {
      const roi = analyzer.calculateROI(-10_000, 25_000);
      expect(roi).toBe(-40); // (-10000/25000) * 100 = -40%
    });
  });

  describe('边界情况', () => {
    it('应该处理零利润机会', () => {
      const zeroProfit = { ...MOCK_SMALL_OPPORTUNITY, grossProfit: 0 };
      const analysis = analyzer.analyzeProfitability(zeroProfit, MOCK_COST_CONFIG, 0);

      expect(analysis.grossProfit).toBe(0);
      expect(analysis.isProfitable).toBe(false);
    });

    it('应该处理极小的滑点', () => {
      const lowSlippage = { ...MOCK_MEDIUM_OPPORTUNITY, estimatedSlippage: 0.0001 };
      const impact = analyzer.estimateSlippageImpact(lowSlippage);

      expect(impact).toBeLessThan(0);
      expect(Math.abs(impact)).toBeLessThan(1000);
    });

    it('应该处理闪电贷场景', () => {
      const analysis = analyzer.analyzeProfitability(
        MOCK_LARGE_OPPORTUNITY,
        MOCK_FLASHLOAN_COST_CONFIG,
        10_000
      );

      expect(analysis.costs.flashLoanFee).toBeGreaterThan(0);
      expect(analysis.costs.total).toBeGreaterThan(0);
    });
  });
});
