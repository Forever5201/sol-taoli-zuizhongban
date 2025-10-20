/**
 * Raydium Borsh 解析器测试
 */

import { describe, it, expect } from '@jest/globals';
import { RaydiumBorshParser } from '../../../packages/onchain-bot/src/parsers/raydium-borsh';

describe('RaydiumBorshParser', () => {
  describe('验证功能', () => {
    it('应该拒绝 null 数据', () => {
      const isValid = RaydiumBorshParser.validate(null);
      expect(isValid).toBe(false);
    });

    it('应该拒绝无效价格', () => {
      const invalidData = {
        dex: 'Raydium',
        poolAddress: 'test',
        price: -1,
        liquidity: 0,
        baseReserve: BigInt(0),
        quoteReserve: BigInt(0),
        baseDecimals: 9,
        quoteDecimals: 6,
        status: BigInt(1),
        timestamp: Date.now(),
      };
      
      const isValid = RaydiumBorshParser.validate(invalidData);
      expect(isValid).toBe(false);
    });

    it('应该拒绝非激活状态', () => {
      const inactivePool = {
        dex: 'Raydium',
        poolAddress: 'test',
        price: 0.05,
        liquidity: 100000,
        baseReserve: BigInt(1000000),
        quoteReserve: BigInt(50000),
        baseDecimals: 9,
        quoteDecimals: 6,
        status: BigInt(0), // 未激活
        timestamp: Date.now(),
      };
      
      const isValid = RaydiumBorshParser.validate(inactivePool);
      expect(isValid).toBe(false);
    });

    it('应该拒绝零储备量', () => {
      const zeroReserve = {
        dex: 'Raydium',
        poolAddress: 'test',
        price: 0.05,
        liquidity: 0,
        baseReserve: BigInt(0),
        quoteReserve: BigInt(0),
        baseDecimals: 9,
        quoteDecimals: 6,
        status: BigInt(1),
        timestamp: Date.now(),
      };
      
      const isValid = RaydiumBorshParser.validate(zeroReserve);
      expect(isValid).toBe(false);
    });

    it('应该接受有效数据', () => {
      const validData = {
        dex: 'Raydium',
        poolAddress: 'test',
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
      
      const isValid = RaydiumBorshParser.validate(validData);
      expect(isValid).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应该处理极大的储备量', () => {
      const largeReserve = {
        dex: 'Raydium',
        poolAddress: 'test',
        price: 0.05,
        liquidity: Number.MAX_SAFE_INTEGER,
        baseReserve: BigInt('9007199254740991'), // Number.MAX_SAFE_INTEGER
        quoteReserve: BigInt('9007199254740991'),
        baseDecimals: 9,
        quoteDecimals: 6,
        status: BigInt(1),
        timestamp: Date.now(),
      };
      
      const isValid = RaydiumBorshParser.validate(largeReserve);
      expect(isValid).toBe(true);
    });
  });
});
