/**
 * 压力测试
 * 测试系统在高负载下的表现
 */

import { CircuitBreaker } from '../../packages/core/src/economics/circuit-breaker';
import { ProfitAnalyzer } from '../../packages/core/src/economics/profit-analyzer';
import { RiskManager } from '../../packages/core/src/economics/risk-manager';
import { MOCK_CIRCUIT_BREAKER_CONFIG, MOCK_MEDIUM_OPPORTUNITY, MOCK_COST_CONFIG, MOCK_CONSERVATIVE_RISK_CONFIG } from '../helpers/mock-data';

describe('压力测试', () => {
  describe('CircuitBreaker并发测试', () => {
    it('应该处理10000次连续交易记录', () => {
      const breaker = new CircuitBreaker(MOCK_CIRCUIT_BREAKER_CONFIG);
      const transactions = 10000;
      
      for (let i = 0; i < transactions; i++) {
        breaker.recordTransaction({
          success: i % 3 !== 0, // 66%成功率
          profit: i % 3 !== 0 ? 100_000 : undefined,
          cost: i % 3 === 0 ? 10_000 : undefined,
          timestamp: Date.now(),
        });
      }
      
      const metrics = breaker.getMetrics();
      expect(metrics.totalAttempts).toBe(transactions);
      expect(metrics.successRate).toBeCloseTo(0.66, 1);
    });

    it('应该正确处理快速状态转换', () => {
      const breaker = new CircuitBreaker({
        maxConsecutiveFailures: 3,
        maxHourlyLoss: 1_000_000,
        minSuccessRate: 0.5,
      });
      
      // 触发熔断
      for (let i = 0; i < 3; i++) {
        breaker.recordTransaction({
          success: false,
          cost: 10_000,
          timestamp: Date.now(),
        });
      }
      
      expect(breaker.getStatus()).toBe('open');
      
      // 重置
      breaker.reset();
      expect(breaker.getStatus()).toBe('closed');
      
      // 再次测试
      for (let i = 0; i < 100; i++) {
        breaker.recordTransaction({
          success: true,
          profit: 50_000,
          timestamp: Date.now(),
        });
      }
      
      expect(breaker.canAttempt()).toBe(true);
    });
  });

  describe('ProfitAnalyzer批量处理', () => {
    const analyzer = new ProfitAnalyzer();
    
    it('应该处理1000个机会的批量分析', () => {
      const opportunities = Array.from({ length: 1000 }, (_, i) => ({
        ...MOCK_MEDIUM_OPPORTUNITY,
        grossProfit: 50_000 + i * 100,
      }));
      
      const analyses = opportunities.map(opp => 
        analyzer.analyzeProfitability(opp, MOCK_COST_CONFIG, 10_000)
      );
      
      expect(analyses.length).toBe(1000);
      expect(analyses.every(a => a.isProfitable !== undefined)).toBe(true);
      
      // 验证排序
      const sorted = analyses.sort((a, b) => b.netProfit - a.netProfit);
      expect(sorted[0].netProfit).toBeGreaterThanOrEqual(sorted[sorted.length - 1].netProfit);
    });

    it('应该处理极端利润值', () => {
      const extremeOpportunities = [
        { ...MOCK_MEDIUM_OPPORTUNITY, grossProfit: 0 },
        { ...MOCK_MEDIUM_OPPORTUNITY, grossProfit: 1 },
        { ...MOCK_MEDIUM_OPPORTUNITY, grossProfit: 1_000_000_000_000 },
        { ...MOCK_MEDIUM_OPPORTUNITY, grossProfit: Number.MAX_SAFE_INTEGER / 1000 },
      ];
      
      extremeOpportunities.forEach(opp => {
        const analysis = analyzer.analyzeProfitability(opp, MOCK_COST_CONFIG, 10_000);
        expect(analysis).toBeDefined();
        expect(Number.isFinite(analysis.netProfit)).toBe(true);
        expect(Number.isFinite(analysis.roi)).toBe(true);
      });
    });
  });

  describe('RiskManager高频检查', () => {
    const analyzer = new ProfitAnalyzer();
    const riskManager = new RiskManager(analyzer);
    
    it('应该处理10000次风险检查without内存泄漏', () => {
      const iterations = 10000;
      const analysis = analyzer.analyzeProfitability(
        MOCK_MEDIUM_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );
      
      // 检查初始内存
      const memBefore = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < iterations; i++) {
        riskManager.preExecutionCheck(
          MOCK_MEDIUM_OPPORTUNITY,
          analysis,
          MOCK_CONSERVATIVE_RISK_CONFIG
        );
      }
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = memAfter - memBefore;
      const memIncreasePerCheck = memIncrease / iterations;
      
      console.log(`   内存增长: ${(memIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   平均每次检查: ${memIncreasePerCheck.toFixed(2)}bytes`);
      
      // 每次检查内存增长应该小于1KB
      expect(memIncreasePerCheck).toBeLessThan(1024);
    });

    it('应该并发处理多个不同配置的检查', () => {
      const configs = [
        MOCK_CONSERVATIVE_RISK_CONFIG,
        { ...MOCK_CONSERVATIVE_RISK_CONFIG, minProfitThreshold: 100_000 },
        { ...MOCK_CONSERVATIVE_RISK_CONFIG, minROI: 0.5 },
        { ...MOCK_CONSERVATIVE_RISK_CONFIG, maxSlippage: 0.01 },
      ];
      
      const analysis = analyzer.analyzeProfitability(
        MOCK_MEDIUM_OPPORTUNITY,
        MOCK_COST_CONFIG,
        10_000
      );
      
      configs.forEach(config => {
        const result = riskManager.preExecutionCheck(
          MOCK_MEDIUM_OPPORTUNITY,
          analysis,
          config
        );
        expect(result).toBeDefined();
        expect(result).toHaveProperty('passed');
        expect(result).toHaveProperty('checks');
      });
    });
  });

  describe('系统级压力测试', () => {
    it('应该处理复杂的多组件交互场景', () => {
      const breaker = new CircuitBreaker(MOCK_CIRCUIT_BREAKER_CONFIG);
      const analyzer = new ProfitAnalyzer();
      const riskManager = new RiskManager(analyzer);
      
      const iterations = 1000;
      let acceptedCount = 0;
      let rejectedCount = 0;
      let breakerTriggered = false;
      
      for (let i = 0; i < iterations; i++) {
        // 检查熔断器状态
        if (!breaker.canAttempt()) {
          breakerTriggered = true;
          rejectedCount++;
          continue;
        }
        
        // 利润分析
        const analysis = analyzer.analyzeProfitability(
          MOCK_MEDIUM_OPPORTUNITY,
          MOCK_COST_CONFIG,
          10_000
        );
        
        // 风险检查
        const riskCheck = riskManager.preExecutionCheck(
          MOCK_MEDIUM_OPPORTUNITY,
          analysis,
          MOCK_CONSERVATIVE_RISK_CONFIG
        );
        
        // 模拟交易结果
        const success = riskCheck.passed && Math.random() > 0.1;
        
        breaker.recordTransaction({
          success,
          profit: success ? analysis.grossProfit : undefined,
          cost: success ? undefined : analysis.costs.total,
          timestamp: Date.now(),
        });
        
        if (riskCheck.passed) {
          acceptedCount++;
        } else {
          rejectedCount++;
        }
      }
      
      console.log(`   接受: ${acceptedCount}/${iterations} (${(acceptedCount/iterations*100).toFixed(1)}%)`);
      console.log(`   拒绝: ${rejectedCount}/${iterations} (${(rejectedCount/iterations*100).toFixed(1)}%)`);
      console.log(`   熔断触发: ${breakerTriggered ? '是' : '否'}`);
      console.log(`   最终状态: ${breaker.getStatus()}`);
      
      const metrics = breaker.getMetrics();
      expect(metrics.totalAttempts).toBeGreaterThan(0);
      expect(metrics.totalAttempts).toBeLessThanOrEqual(iterations);
    });

    it('应该在持续负载下保持性能稳定', () => {
      const analyzer = new ProfitAnalyzer();
      const riskManager = new RiskManager(analyzer);
      const samples = 10;
      const iterationsPerSample = 1000;
      const times: number[] = [];
      
      for (let sample = 0; sample < samples; sample++) {
        const start = performance.now();
        
        for (let i = 0; i < iterationsPerSample; i++) {
          const analysis = analyzer.analyzeProfitability(
            MOCK_MEDIUM_OPPORTUNITY,
            MOCK_COST_CONFIG,
            10_000
          );
          
          riskManager.preExecutionCheck(
            MOCK_MEDIUM_OPPORTUNITY,
            analysis,
            MOCK_CONSERVATIVE_RISK_CONFIG
          );
        }
        
        const end = performance.now();
        times.push(end - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const variance = maxTime - minTime;
      
      console.log(`   平均时间: ${avgTime.toFixed(2)}ms`);
      console.log(`   最大时间: ${maxTime.toFixed(2)}ms`);
      console.log(`   最小时间: ${minTime.toFixed(2)}ms`);
      console.log(`   方差: ${variance.toFixed(2)}ms`);
      
      // 性能应该保持稳定，方差不超过平均值的200%
      // 在Node.js和CI环境中，由于GC、事件循环和资源限制的影响，允许更大的方差
      expect(variance).toBeLessThan(avgTime * 2);
    });
  });
});
