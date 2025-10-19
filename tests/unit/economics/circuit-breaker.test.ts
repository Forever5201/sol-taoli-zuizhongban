/**
 * CircuitBreaker 单元测试（修复版）
 */

import { CircuitBreaker } from '../../../packages/core/src/economics/circuit-breaker';
import { MOCK_CIRCUIT_BREAKER_CONFIG } from '../../helpers/mock-data';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(MOCK_CIRCUIT_BREAKER_CONFIG);
  });

  describe('初始状态', () => {
    it('应该以closed状态开始', () => {
      expect(breaker.getStatus()).toBe('closed');
    });

    it('应该允许交易', () => {
      expect(breaker.canAttempt()).toBe(true);
    });

    it('应该有初始化的指标', () => {
      const metrics = breaker.getMetrics();
      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.consecutiveFailures).toBe(0);
    });
  });

  describe('recordTransaction', () => {
    it('应该记录成功的交易', () => {
      breaker.recordTransaction({
        success: true,
        profit: 100_000,
        timestamp: Date.now(),
      });

      const metrics = breaker.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.successCount).toBe(1);
      expect(metrics.consecutiveFailures).toBe(0);
    });

    it('应该记录失败的交易', () => {
      breaker.recordTransaction({
        success: false,
        cost: 50_000,
        timestamp: Date.now(),
      });

      const metrics = breaker.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.successCount).toBe(0);
      expect(metrics.consecutiveFailures).toBe(1);
    });

    it('成功交易应该重置连续失败计数', () => {
      breaker.recordTransaction({
        success: false,
        cost: 10_000,
        timestamp: Date.now(),
      });
      breaker.recordTransaction({
        success: false,
        cost: 10_000,
        timestamp: Date.now(),
      });
      breaker.recordTransaction({
        success: true,
        profit: 50_000,
        timestamp: Date.now(),
      });

      const metrics = breaker.getMetrics();
      expect(metrics.consecutiveFailures).toBe(0);
    });
  });

  describe('熔断触发', () => {
    it('连续失败达到阈值时应该触发', () => {
      const maxFailures = MOCK_CIRCUIT_BREAKER_CONFIG.maxConsecutiveFailures;

      for (let i = 0; i < maxFailures; i++) {
        breaker.recordTransaction({
          success: false,
          cost: 10_000,
          timestamp: Date.now(),
        });
      }

      expect(breaker.getStatus()).toBe('open');
      expect(breaker.canAttempt()).toBe(false);
    });

    it('小时亏损达到阈值时应该触发', () => {
      const maxLoss = MOCK_CIRCUIT_BREAKER_CONFIG.maxHourlyLoss;
      const lossPerTransaction = Math.ceil(maxLoss / 2) + 1; // 确保超过阈值

      breaker.recordTransaction({
        success: false,
        cost: lossPerTransaction,
        timestamp: Date.now(),
      });
      breaker.recordTransaction({
        success: false,
        cost: lossPerTransaction,
        timestamp: Date.now(),
      });

      expect(breaker.getStatus()).toBe('open');
    });

    it('成功率过低时应该触发', () => {
      // 记录20次交易，成功率很低
      for (let i = 0; i < 20; i++) {
        breaker.recordTransaction({
          success: i < 3, // 只有3次成功，成功率15%
          profit: i < 3 ? 50_000 : undefined,
          cost: i >= 3 ? 10_000 : undefined,
          timestamp: Date.now(),
        });
      }

      expect(breaker.getStatus()).toBe('open');
    });
  });

  describe('shouldBreak', () => {
    it('正常情况不应该熔断', () => {
      const result = breaker.shouldBreak();
      expect(result.shouldBreak).toBe(false);
    });

    it('应该返回熔断原因', () => {
      const maxFailures = MOCK_CIRCUIT_BREAKER_CONFIG.maxConsecutiveFailures;

      for (let i = 0; i < maxFailures; i++) {
        breaker.recordTransaction({
          success: false,
          cost: 10_000,
          timestamp: Date.now(),
        });
      }

      const result = breaker.shouldBreak();
      expect(result.shouldBreak).toBe(true);
      expect(result.reason).toBeDefined();
      expect(result.metrics).toBeDefined();
    });
  });

  describe('canAttempt', () => {
    it('closed状态应该允许交易', () => {
      expect(breaker.canAttempt()).toBe(true);
    });

    it('open状态应该拒绝交易', () => {
      const maxFailures = MOCK_CIRCUIT_BREAKER_CONFIG.maxConsecutiveFailures;

      for (let i = 0; i < maxFailures; i++) {
        breaker.recordTransaction({
          success: false,
          cost: 10_000,
          timestamp: Date.now(),
        });
      }

      expect(breaker.canAttempt()).toBe(false);
    });
  });

  describe('getMetrics', () => {
    it('应该返回指标快照', () => {
      breaker.recordTransaction({
        success: true,
        profit: 100_000,
        timestamp: Date.now(),
      });

      const metrics = breaker.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.successCount).toBe(1);
      expect(metrics.successRate).toBe(1);
    });

    it('应该正确计算成功率', () => {
      for (let i = 0; i < 10; i++) {
        breaker.recordTransaction({
          success: i < 7, // 7次成功
          profit: i < 7 ? 50_000 : undefined,
          cost: i >= 7 ? 10_000 : undefined,
          timestamp: Date.now(),
        });
      }

      const metrics = breaker.getMetrics();
      expect(metrics.successRate).toBeCloseTo(0.7, 2);
    });
  });

  describe('reset', () => {
    it('应该重置熔断器', () => {
      // 触发熔断
      const maxFailures = MOCK_CIRCUIT_BREAKER_CONFIG.maxConsecutiveFailures;
      for (let i = 0; i < maxFailures; i++) {
        breaker.recordTransaction({
          success: false,
          cost: 10_000,
          timestamp: Date.now(),
        });
      }

      breaker.reset();

      expect(breaker.getStatus()).toBe('closed');
      expect(breaker.canAttempt()).toBe(true);
      const metrics = breaker.getMetrics();
      expect(metrics.totalAttempts).toBe(0);
    });
  });
});
