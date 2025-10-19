/**
 * Raydium V2 解析器测试
 */

import { describe, it, expect } from '@jest/globals';
import { RaydiumParserV2 } from '../../../packages/onchain-bot/src/parsers/raydium-v2';

describe('RaydiumParserV2', () => {
  describe('价格计算', () => {
    it('应该正确计算价格', () => {
      const baseReserve = BigInt('1000000000000000'); // 1,000,000 tokens (9 decimals = 10^15 lamports)
      const quoteReserve = BigInt('50000000000'); // 50,000 USDC (6 decimals = 5×10^10 lamports)
      
      const price = RaydiumParserV2.calculatePrice(
        baseReserve,
        quoteReserve,
        9, // SOL decimals
        6  // USDC decimals
      );

      // 预期价格 = 50,000 / 1,000,000 = 0.05 USDC/token
      expect(price).toBeCloseTo(0.05, 5);
    });

    it('应该处理零储备量', () => {
      const price = RaydiumParserV2.calculatePrice(
        BigInt(0),
        BigInt(1000000),
        9,
        6
      );

      expect(price).toBe(0);
    });
  });

  describe('滑点计算', () => {
    it('应该使用 AMM 公式计算精确滑点', () => {
      // 池子: 1M SOL, 50K USDC
      const inputReserve = BigInt(1000000);
      const outputReserve = BigInt(50000);
      const feeRate = 0.0025; // 0.25%

      // 交易: 1000 SOL
      const inputAmount = 1000;

      const result = RaydiumParserV2.calculateExactSlippage(
        inputAmount,
        inputReserve,
        outputReserve,
        feeRate
      );

      // 验证输出金额 > 0
      expect(result.outputAmount).toBeGreaterThan(0);
      
      // 验证价格影响 < 输入比例
      expect(result.priceImpact).toBeGreaterThan(0);
      expect(result.priceImpact).toBeLessThan(inputAmount / Number(inputReserve));

      // 验证有效价格
      expect(result.effectivePrice).toBeGreaterThan(0);

      console.log('滑点计算结果:', result);
    });

    it('小额交易应该有低滑点', () => {
      const inputReserve = BigInt(1000000);
      const outputReserve = BigInt(50000);
      const feeRate = 0.0025;

      // 小额交易: 10 tokens (0.001%)
      const result = RaydiumParserV2.calculateExactSlippage(
        10,
        inputReserve,
        outputReserve,
        feeRate
      );

      // 滑点应该接近手续费率
      expect(result.priceImpact).toBeLessThan(0.01); // < 1%
    });

    it('大额交易应该有高滑点', () => {
      const inputReserve = BigInt(1000000);
      const outputReserve = BigInt(50000);
      const feeRate = 0.0025;

      // 大额交易: 100K tokens (10%)
      const result = RaydiumParserV2.calculateExactSlippage(
        100000,
        inputReserve,
        outputReserve,
        feeRate
      );

      // 滑点应该明显
      expect(result.priceImpact).toBeGreaterThan(0.05); // > 5%
    });
  });

  describe('最优交易量计算', () => {
    it('应该计算套利最优交易量', () => {
      // Pool A: 1M:50K (price = 0.05)
      const poolAIn = BigInt(1000000);
      const poolAOut = BigInt(50000);
      
      // Pool B: 1M:60K (price = 0.06, 20% 价差)
      const poolBIn = BigInt(50000);
      const poolBOut = BigInt(1000000);

      const feeRateA = 0.003;
      const feeRateB = 0.003;

      const optimalAmount = RaydiumParserV2.calculateOptimalTradeAmount(
        poolAIn,
        poolAOut,
        poolBIn,
        poolBOut,
        feeRateA,
        feeRateB
      );

      // 应该有最优交易量
      expect(optimalAmount).toBeGreaterThan(0);
      
      // 不应该超过池子容量的 10%
      expect(optimalAmount).toBeLessThanOrEqual(Number(poolAIn) * 0.1);

      console.log('最优交易量:', optimalAmount);
    });

    it('无套利空间时应该返回0', () => {
      // 两个池子价格相同
      const poolAIn = BigInt(1000000);
      const poolAOut = BigInt(50000);
      const poolBIn = BigInt(1000000);
      const poolBOut = BigInt(50000);

      const optimalAmount = RaydiumParserV2.calculateOptimalTradeAmount(
        poolAIn,
        poolAOut,
        poolBIn,
        poolBOut,
        0.003,
        0.003
      );

      expect(optimalAmount).toBe(0);
    });
  });

  describe('数据验证', () => {
    it('应该验证有效的价格数据', () => {
      const validData = {
        dex: 'Raydium',
        poolAddress: '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
        price: 0.05,
        liquidity: 100000,
        baseReserve: BigInt(1000000),
        quoteReserve: BigInt(50000),
        baseDecimals: 9,
        quoteDecimals: 6,
        feeRate: 0.0025,
        status: BigInt(1),
        timestamp: Date.now(),
      };

      expect(RaydiumParserV2.validate(validData)).toBe(true);
    });

    it('应该拒绝无效价格', () => {
      const invalidData = {
        dex: 'Raydium',
        poolAddress: 'test',
        price: -1,
        liquidity: 100000,
        baseReserve: BigInt(1000000),
        quoteReserve: BigInt(50000),
        baseDecimals: 9,
        quoteDecimals: 6,
        feeRate: 0.0025,
        status: BigInt(1),
        timestamp: Date.now(),
      };

      expect(RaydiumParserV2.validate(invalidData)).toBe(false);
    });

    it('应该拒绝非激活状态', () => {
      const inactiveData = {
        dex: 'Raydium',
        poolAddress: 'test',
        price: 0.05,
        liquidity: 100000,
        baseReserve: BigInt(1000000),
        quoteReserve: BigInt(50000),
        baseDecimals: 9,
        quoteDecimals: 6,
        feeRate: 0.0025,
        status: BigInt(0), // 未激活
        timestamp: Date.now(),
      };

      expect(RaydiumParserV2.validate(inactiveData)).toBe(false);
    });

    it('应该拒绝零储备量', () => {
      const zeroReserveData = {
        dex: 'Raydium',
        poolAddress: 'test',
        price: 0.05,
        liquidity: 100000,
        baseReserve: BigInt(0),
        quoteReserve: BigInt(50000),
        baseDecimals: 9,
        quoteDecimals: 6,
        feeRate: 0.0025,
        status: BigInt(1),
        timestamp: Date.now(),
      };

      expect(RaydiumParserV2.validate(zeroReserveData)).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该处理极大的储备量', () => {
      const baseReserve = BigInt('1000000000000000000'); // 1B tokens
      const quoteReserve = BigInt('50000000000000000'); // 50M USDC

      const price = RaydiumParserV2.calculatePrice(
        baseReserve,
        quoteReserve,
        9,
        6
      );

      expect(price).toBeGreaterThan(0);
      expect(isFinite(price)).toBe(true);
    });

    it('应该处理极小的交易量', () => {
      const inputReserve = BigInt(1000000);
      const outputReserve = BigInt(50000);

      const result = RaydiumParserV2.calculateExactSlippage(
        0.001, // 0.001 tokens
        inputReserve,
        outputReserve,
        0.0025
      );

      expect(result.outputAmount).toBeGreaterThan(0);
      expect(result.priceImpact).toBeGreaterThanOrEqual(0);
    });
  });
});
