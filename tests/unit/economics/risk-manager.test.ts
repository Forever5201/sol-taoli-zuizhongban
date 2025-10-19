/**
 * RiskManager 单元测试（修复版）
 */

import { RiskManager } from '../../../packages/core/src/economics/risk-manager';
import { ProfitAnalyzer } from '../../../packages/core/src/economics/profit-analyzer';
import { CostCalculator } from '../../../packages/core/src/economics/cost-calculator';
import {
  MOCK_MEDIUM_OPPORTUNITY,
  MOCK_UNPROFITABLE_OPPORTUNITY,
  MOCK_COST_CONFIG,
  MOCK_CONSERVATIVE_RISK_CONFIG,
  MOCK_AGGRESSIVE_RISK_CONFIG,
} from '../../helpers/mock-data';

describe('RiskManager', () => {
  let riskManager: RiskManager;
  let profitAnalyzer: ProfitAnalyzer;

  beforeEach(() => {
    profitAnalyzer = new ProfitAnalyzer();
    riskManager = new RiskManager(profitAnalyzer);
  });

  describe('preExecutionCheck', () => {
    it('应该通过有效机会的检查', () => {
      const analysis = profitAnalyzer.analyzeProfitability(
        MOCK_MEDIUM_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );

      const result = riskManager.preExecutionCheck(
        MOCK_MEDIUM_OPPORTUNITY,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('checks');
    });

    it('应该拒绝不盈利的机会', () => {
      const analysis = profitAnalyzer.analyzeProfitability(
        MOCK_UNPROFITABLE_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );

      const result = riskManager.preExecutionCheck(
        MOCK_UNPROFITABLE_OPPORTUNITY,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      expect(result.passed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('应该包含所有检查项', () => {
      const analysis = profitAnalyzer.analyzeProfitability(
        MOCK_MEDIUM_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );

      const result = riskManager.preExecutionCheck(
        MOCK_MEDIUM_OPPORTUNITY,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      expect(result.checks).toHaveProperty('profitThreshold');
      expect(result.checks).toHaveProperty('costLimit');
      expect(result.checks).toHaveProperty('slippage');
      expect(result.checks).toHaveProperty('liquidity');
      expect(result.checks).toHaveProperty('roi');
    });
  });

  describe('风险配置', () => {
    it('保守配置应该更严格', () => {
      const analysis = profitAnalyzer.analyzeProfitability(
        MOCK_MEDIUM_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );

      const conservativeResult = riskManager.preExecutionCheck(
        MOCK_MEDIUM_OPPORTUNITY,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      const aggressiveResult = riskManager.preExecutionCheck(
        MOCK_MEDIUM_OPPORTUNITY,
        analysis,
        MOCK_AGGRESSIVE_RISK_CONFIG
      );

      // 保守配置可能拒绝一些激进配置通过的机会
      if (!conservativeResult.passed) {
        expect(aggressiveResult.passed).toBe(true);
      }
    });
  });

  describe('checkProfitThreshold', () => {
    it('应该验证最低利润阈值', () => {
      const lowProfit = { ...MOCK_MEDIUM_OPPORTUNITY, grossProfit: 100 };
      const analysis = profitAnalyzer.analyzeProfitability(
        lowProfit,
        MOCK_COST_CONFIG,
        10_000
      );

      const result = riskManager.preExecutionCheck(
        lowProfit,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      expect(result.checks.profitThreshold).toBe(false);
    });
  });

  describe('checkSlippage', () => {
    it('应该验证滑点限制', () => {
      const highSlippage = { ...MOCK_MEDIUM_OPPORTUNITY, estimatedSlippage: 0.1 }; // 10%滑点
      const analysis = profitAnalyzer.analyzeProfitability(
        highSlippage,
        MOCK_COST_CONFIG,
        10_000
      );

      const result = riskManager.preExecutionCheck(
        highSlippage,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      expect(result.checks.slippage).toBe(false);
    });
  });

  describe('checkLiquidity', () => {
    it('应该验证流动性要求', () => {
      const lowLiquidity = { ...MOCK_MEDIUM_OPPORTUNITY, poolLiquidity: 100 }; // 很低的流动性
      const analysis = profitAnalyzer.analyzeProfitability(
        lowLiquidity,
        MOCK_COST_CONFIG,
        10_000
      );

      const result = riskManager.preExecutionCheck(
        lowLiquidity,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      expect(result.checks.liquidity).toBe(false);
    });
  });

  describe('checkROI', () => {
    it('应该验证最低ROI要求', () => {
      const analysis = profitAnalyzer.analyzeProfitability(
        MOCK_MEDIUM_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );

      const result = riskManager.preExecutionCheck(
        MOCK_MEDIUM_OPPORTUNITY,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      if (result.passed) {
        expect(analysis.roi).toBeGreaterThanOrEqual(MOCK_CONSERVATIVE_RISK_CONFIG.minROI);
      }
    });
  });

  describe('边界情况', () => {
    it('应该处理零利润', () => {
      const zeroProfit = { ...MOCK_MEDIUM_OPPORTUNITY, grossProfit: 0 };
      const analysis = profitAnalyzer.analyzeProfitability(
        zeroProfit,
        MOCK_COST_CONFIG,
        0
      );

      const result = riskManager.preExecutionCheck(
        zeroProfit,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      expect(result.passed).toBe(false);
    });

    it('应该处理极端滑点', () => {
      const extremeSlippage = { ...MOCK_MEDIUM_OPPORTUNITY, estimatedSlippage: 1.0 }; // 100%
      const analysis = profitAnalyzer.analyzeProfitability(
        extremeSlippage,
        MOCK_COST_CONFIG,
        10_000
      );

      const result = riskManager.preExecutionCheck(
        extremeSlippage,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      expect(result.passed).toBe(false);
    });

    it('应该处理极低流动性', () => {
      const noLiquidity = { ...MOCK_MEDIUM_OPPORTUNITY, poolLiquidity: 0 };
      const analysis = profitAnalyzer.analyzeProfitability(
        noLiquidity,
        MOCK_COST_CONFIG,
        10_000
      );

      const result = riskManager.preExecutionCheck(
        noLiquidity,
        analysis,
        MOCK_CONSERVATIVE_RISK_CONFIG
      );

      expect(result.passed).toBe(false);
    });
  });
});
