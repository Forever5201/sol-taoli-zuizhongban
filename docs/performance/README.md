# 性能优化文档

本目录包含所有性能优化和延迟优化相关的文档。

## ⚡ 最新优化（推荐优先阅读）

### 延迟优化系列（2025年10月）
1. **[LATENCY_OPTIMIZATION_COMPLETE.md](./LATENCY_OPTIMIZATION_COMPLETE.md)** ⭐核心文档
   - P0: Quote API切换（Ultra Order → Legacy Quote → Lite API）
   - P1: 连接预热（解决TLS握手延迟）
   - P2: ALT缓存（减少RPC调用）
   
2. **[LATENCY_STATISTICS_IMPLEMENTATION.md](./LATENCY_STATISTICS_IMPLEMENTATION.md)**
   - 延迟统计实时日志实现
   - 详细查询性能监控
   
3. **[如何查看延迟统计日志.md](./如何查看延迟统计日志.md)** ⭐中文说明
   - 日志解读指南
   - 性能指标说明
   
4. **[TLS_WARMUP_FIX_REPORT.md](./TLS_WARMUP_FIX_REPORT.md)**
   - TLS握手失败诊断与修复
   - 预热API从Quote切换到Lite的原因
   
5. **[QUOTE_API_BLOCKING_FIX.md](./QUOTE_API_BLOCKING_FIX.md)**
   - Quote API被代理阻止问题
   - 最终切换到Lite API的完整分析

### 中文优化文档
- [延迟优化完成报告.md](./延迟优化完成报告.md) - 延迟优化总结（中文版）

## 🚀 其他性能优化

- [ADVANCED_OPTIMIZATION_STRATEGIES.md](./ADVANCED_OPTIMIZATION_STRATEGIES.md) - 高级优化策略
- [SLIPPAGE_OPTIMIZATION_COMPLETE.md](./SLIPPAGE_OPTIMIZATION_COMPLETE.md) - 滑点优化
- [TIP_OPTIMIZATION_COMPLETE.md](./TIP_OPTIMIZATION_COMPLETE.md) - 小费优化
- [TIP_OPTIMIZATION_QUICKSTART.md](./TIP_OPTIMIZATION_QUICKSTART.md) - 小费优化快速指南
- [COVERAGE_OPTIMIZATION_REPORT.md](./COVERAGE_OPTIMIZATION_REPORT.md) - 覆盖率优化

## 📊 关键性能指标

根据最新优化，系统性能指标：
- **平均查询延迟**: ~250-260ms（使用Lite API + 代理）
- **预热成功率**: 100%（切换到Lite API后）
- **查询成功率**: 100%（国内代理环境）
- **ALT缓存命中**: 显著减少RPC调用

## 🔍 阅读建议

1. **查看当前性能**: 如何查看延迟统计日志.md
2. **理解优化原理**: LATENCY_OPTIMIZATION_COMPLETE.md
3. **故障排查**: TLS_WARMUP_FIX_REPORT.md + QUOTE_API_BLOCKING_FIX.md
4. **进一步优化**: ADVANCED_OPTIMIZATION_STRATEGIES.md

