/**
 * CostCalculator 单元测试（修复版）
 * 测试成本计算的准确性
 */

import { CostCalculator } from '../../../packages/core/src/economics/cost-calculator';
import { BASE_FEE_PER_SIGNATURE, FLASH_LOAN_FEE_RATE } from '../../../packages/core/src/economics/types';
import { MOCK_COST_CONFIG } from '../../helpers/mock-data';

describe('CostCalculator', () => {
  describe('calculateBaseFee', () => {
    it('应该正确计算基础费用', () => {
      const baseFee = CostCalculator.calculateBaseFee(2);
      expect(baseFee).toBe(2 * BASE_FEE_PER_SIGNATURE); // 10,000 lamports
    });

    it('应该处理多个签名', () => {
      const baseFee = CostCalculator.calculateBaseFee(4);
      expect(baseFee).toBe(4 * BASE_FEE_PER_SIGNATURE); // 20,000 lamports
    });

    it('应该处理单个签名', () => {
      const baseFee = CostCalculator.calculateBaseFee(1);
      expect(baseFee).toBe(BASE_FEE_PER_SIGNATURE); // 5,000 lamports
    });
  });

  describe('calculatePriorityFee', () => {
    it('应该正确计算优先费', () => {
      const priorityFee = CostCalculator.calculatePriorityFee(300_000, 50);
      expect(priorityFee).toBe(15); // (300,000 * 50) / 1,000,000 = 15 lamports
    });

    it('应该向上取整', () => {
      const priorityFee = CostCalculator.calculatePriorityFee(100_000, 15);
      expect(priorityFee).toBe(2); // 向上取整
    });

    it('应该处理零值', () => {
      const priorityFee = CostCalculator.calculatePriorityFee(0, 50);
      expect(priorityFee).toBe(0);
    });
  });

  describe('calculateFlashLoanFee', () => {
    it('应该正确计算闪电贷费用', () => {
      const amount = 50 * 1_000_000_000; // 50 SOL
      const fee = CostCalculator.calculateFlashLoanFee(amount);
      const expected = Math.ceil(amount * FLASH_LOAN_FEE_RATE);
      expect(fee).toBe(expected);
    });

    it('应该处理零值', () => {
      const fee = CostCalculator.calculateFlashLoanFee(0);
      expect(fee).toBe(0);
    });
  });

  describe('calculateTotalCost', () => {
    it('应该正确计算总成本（无闪电贷）', () => {
      const costs = CostCalculator.calculateTotalCost(MOCK_COST_CONFIG, 10_000);
      
      expect(costs.baseFee).toBeGreaterThan(0);
      expect(costs.priorityFee).toBeGreaterThan(0);
      expect(costs.jitoTip).toBe(10_000);
      expect(costs.total).toBeGreaterThan(0);
    });

    it('应该包含所有成本组件', () => {
      const costs = CostCalculator.calculateTotalCost(MOCK_COST_CONFIG, 5_000);
      
      expect(costs).toHaveProperty('baseFee');
      expect(costs).toHaveProperty('priorityFee');
      expect(costs).toHaveProperty('jitoTip');
      expect(costs).toHaveProperty('rpcCost');
      expect(costs).toHaveProperty('total');
      expect(costs).toHaveProperty('breakdown');
    });
  });

  describe('estimateComputeUnits', () => {
    it('应该使用配置的计算单元', () => {
      const config = { ...MOCK_COST_CONFIG, computeUnits: 400_000 };
      const units = CostCalculator.estimateComputeUnits(config);
      expect(units).toBe(400_000);
    });

    it('应该估算简单交易的计算单元', () => {
      const config = { ...MOCK_COST_CONFIG, computeUnits: 0, useFlashLoan: false };
      const units = CostCalculator.estimateComputeUnits(config);
      expect(units).toBeGreaterThan(0);
      expect(units).toBeLessThanOrEqual(1_400_000); // Solana上限
    });
  });

  describe('边界情况', () => {
    it('应该处理最小配置', () => {
      const minConfig = {
        signatureCount: 1,
        computeUnits: 100_000,
        computeUnitPrice: 1,
        useFlashLoan: false,
      };
      const costs = CostCalculator.calculateTotalCost(minConfig, 0);
      expect(costs.total).toBeGreaterThan(0);
    });

    it('应该处理大额Jito小费', () => {
      const largeTip = 1_000_000_000; // 1 SOL
      const costs = CostCalculator.calculateTotalCost(MOCK_COST_CONFIG, largeTip);
      expect(costs.jitoTip).toBe(largeTip);
      expect(costs.total).toBeGreaterThan(largeTip);
    });
  });
});
