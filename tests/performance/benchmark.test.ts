/**
 * 性能基准测试
 * 测量核心功能的执行时间和资源使用
 */

import { performance } from 'perf_hooks';
import { CostCalculator } from '../../packages/core/src/economics/cost-calculator';
import { CircuitBreaker } from '../../packages/core/src/economics/circuit-breaker';
import { ProfitAnalyzer } from '../../packages/core/src/economics/profit-analyzer';
import { RiskManager } from '../../packages/core/src/economics/risk-manager';
import { MOCK_MEDIUM_OPPORTUNITY, MOCK_COST_CONFIG, MOCK_CIRCUIT_BREAKER_CONFIG, MOCK_CONSERVATIVE_RISK_CONFIG } from '../helpers/mock-data';

// 性能基准阈值（毫秒）
const THRESHOLDS = {
  costCalculation: 1,        // 成本计算应该<1ms
  profitAnalysis: 2,         // 利润分析应该<2ms
  riskCheck: 3,              // 风险检查应该<3ms
  circuitBreakerCheck: 0.5,  // 熔断检查应该<0.5ms
};

describe('性能基准测试', () => {
  describe('CostCalculator性能', () => {
    it('calculateBaseFee应该在1ms内完成', () => {
      const iterations = 10000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        CostCalculator.calculateBaseFee(2);
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`   平均耗时: ${avgTime.toFixed(4)}ms`);
      
      expect(avgTime).toBeLessThan(THRESHOLDS.costCalculation);
    });

    it('calculateTotalCost应该在1ms内完成', () => {
      const iterations = 1000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        CostCalculator.calculateTotalCost(MOCK_COST_CONFIG, 10_000);
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`   平均耗时: ${avgTime.toFixed(4)}ms`);
      
      expect(avgTime).toBeLessThan(THRESHOLDS.costCalculation);
    });
  });

  describe('ProfitAnalyzer性能', () => {
    const analyzer = new ProfitAnalyzer();
    
    it('analyzeProfitability应该在2ms内完成', () => {
      const iterations = 1000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        analyzer.analyzeProfitability(
          MOCK_MEDIUM_OPPORTUNITY,
          MOCK_COST_CONFIG,
          10_000
        );
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`   平均耗时: ${avgTime.toFixed(4)}ms`);
      
      expect(avgTime).toBeLessThan(THRESHOLDS.profitAnalysis);
    });

    it('calculateNetProfit应该在1ms内完成', () => {
      const iterations = 10000;
      const costs = CostCalculator.calculateTotalCost(MOCK_COST_CONFIG, 10_000);
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        analyzer.calculateNetProfit(MOCK_MEDIUM_OPPORTUNITY, costs);
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`   平均耗时: ${avgTime.toFixed(4)}ms`);
      
      expect(avgTime).toBeLessThan(THRESHOLDS.costCalculation);
    });
  });

  describe('RiskManager性能', () => {
    const analyzer = new ProfitAnalyzer();
    const riskManager = new RiskManager(analyzer);
    
    it('preExecutionCheck应该在3ms内完成', () => {
      const iterations = 1000;
      const analysis = analyzer.analyzeProfitability(
        MOCK_MEDIUM_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        riskManager.preExecutionCheck(
          MOCK_MEDIUM_OPPORTUNITY,
          analysis,
          MOCK_CONSERVATIVE_RISK_CONFIG
        );
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`   平均耗时: ${avgTime.toFixed(4)}ms`);
      
      expect(avgTime).toBeLessThan(THRESHOLDS.riskCheck);
    });
  });

  describe('CircuitBreaker性能', () => {
    let breaker: CircuitBreaker;
    
    beforeEach(() => {
      breaker = new CircuitBreaker(MOCK_CIRCUIT_BREAKER_CONFIG);
    });

    it('shouldBreak应该在0.5ms内完成', () => {
      const iterations = 10000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        breaker.shouldBreak();
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`   平均耗时: ${avgTime.toFixed(4)}ms`);
      
      expect(avgTime).toBeLessThan(THRESHOLDS.circuitBreakerCheck);
    });

    it('recordTransaction应该在0.5ms内完成', () => {
      const iterations = 10000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        breaker.recordTransaction({
          success: i % 2 === 0,
          profit: i % 2 === 0 ? 100_000 : undefined,
          cost: i % 2 === 0 ? undefined : 10_000,
          timestamp: Date.now(),
        });
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`   平均耗时: ${avgTime.toFixed(4)}ms`);
      
      expect(avgTime).toBeLessThan(THRESHOLDS.circuitBreakerCheck);
    });
  });

  describe('综合性能测试', () => {
    it('完整决策流程应该在5ms内完成', () => {
      const iterations = 1000;
      const analyzer = new ProfitAnalyzer();
      const riskManager = new RiskManager(analyzer);
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        // 1. 成本计算
        const costs = CostCalculator.calculateTotalCost(MOCK_COST_CONFIG, 10_000);
        
        // 2. 利润分析
        const analysis = analyzer.analyzeProfitability(
          MOCK_MEDIUM_OPPORTUNITY,
          MOCK_COST_CONFIG,
          10_000
        );
        
        // 3. 风险检查
        riskManager.preExecutionCheck(
          MOCK_MEDIUM_OPPORTUNITY,
          analysis,
          MOCK_CONSERVATIVE_RISK_CONFIG
        );
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`   平均耗时: ${avgTime.toFixed(4)}ms`);
      console.log(`   预计TPS: ${(1000 / avgTime).toFixed(0)} 决策/秒`);
      
      expect(avgTime).toBeLessThan(5);
    });
  });
});
