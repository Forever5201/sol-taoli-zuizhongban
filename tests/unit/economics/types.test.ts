/**
 * Types 工具函数单元测试
 * 覆盖格式化和常量验证
 */

import {
  LAMPORTS_PER_SOL,
  BASE_FEE_PER_SIGNATURE,
  FLASH_LOAN_FEE_RATE,
  formatLamportsToSOL,
  formatPercentage,
} from '../../../packages/core/src/economics/types';

describe('Economics Types & Utilities', () => {
  describe('Constants', () => {
    it('LAMPORTS_PER_SOL应该是10亿', () => {
      expect(LAMPORTS_PER_SOL).toBe(1_000_000_000);
    });

    it('BASE_FEE_PER_SIGNATURE应该是5000 lamports', () => {
      expect(BASE_FEE_PER_SIGNATURE).toBe(5_000);
    });

    it('FLASH_LOAN_FEE_RATE应该是0.09%', () => {
      expect(FLASH_LOAN_FEE_RATE).toBe(0.0009);
    });
  });

  describe('formatLamportsToSOL', () => {
    it('应该正确转换lamports为SOL', () => {
      const result = formatLamportsToSOL(1_000_000_000);
      expect(result).toBe('1.000000000 SOL');
    });

    it('应该处理小额lamports', () => {
      const result = formatLamportsToSOL(5_000);
      expect(result).toBe('0.000005000 SOL');
    });

    it('应该处理零值', () => {
      const result = formatLamportsToSOL(0);
      expect(result).toBe('0.000000000 SOL');
    });

    it('应该处理大额SOL', () => {
      const result = formatLamportsToSOL(100_000_000_000);
      expect(result).toBe('100.000000000 SOL');
    });

    it('应该保留9位小数', () => {
      const result = formatLamportsToSOL(123456789);
      expect(result).toContain('.');
      const decimalPart = result.split('.')[1].replace(' SOL', '');
      expect(decimalPart).toHaveLength(9); // 9位小数
    });
  });

  describe('formatPercentage', () => {
    it('应该正确转换小数为百分比', () => {
      const result = formatPercentage(0.5);
      expect(result).toBe('50.00%');
    });

    it('应该处理零值', () => {
      const result = formatPercentage(0);
      expect(result).toBe('0.00%');
    });

    it('应该处理100%', () => {
      const result = formatPercentage(1);
      expect(result).toBe('100.00%');
    });

    it('应该处理小百分比', () => {
      const result = formatPercentage(0.0009);
      expect(result).toBe('0.09%');
    });

    it('应该保留2位小数', () => {
      const result = formatPercentage(0.123456);
      expect(result).toBe('12.35%'); // 四舍五入
    });

    it('应该处理超过100%的值', () => {
      const result = formatPercentage(1.5);
      expect(result).toBe('150.00%');
    });

    it('应该处理负值', () => {
      const result = formatPercentage(-0.25);
      expect(result).toBe('-25.00%');
    });
  });

  describe('边界情况', () => {
    it('formatLamportsToSOL应该处理负值', () => {
      const result = formatLamportsToSOL(-1_000_000_000);
      expect(result).toBe('-1.000000000 SOL');
    });

    it('formatLamportsToSOL应该处理极大值', () => {
      const result = formatLamportsToSOL(Number.MAX_SAFE_INTEGER);
      expect(result).toContain('SOL');
      expect(Number.isFinite(parseFloat(result))).toBe(true);
    });

    it('formatPercentage应该处理极小值', () => {
      const result = formatPercentage(0.000001);
      expect(result).toBe('0.00%');
    });
  });
});
