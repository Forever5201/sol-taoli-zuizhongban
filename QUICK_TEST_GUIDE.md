# 快速测试指南 - Ultra API延迟优化

## 🚀 立即开始测试

### 第一步：启动Bot

```bash
.\start-flashloan-dryrun.bat
```

### 第二步：观察前30秒日志

✅ **期望看到**:
```
[Worker 0] 🚀 Warming up connection pool (10 connections)...
[Worker 0] using AGGRESSIVE proxy config: keepAlive=50ms, pool=20, timeout=1.5s
[Worker 0] ✅ Connection 1/10 ready
[Worker 0] ✅ Connection 2/10 ready
...
[Worker 0] ✅ Connection pool warmed with 10 hot connections
```

⚠️ **如果看到**:
- `⚠️ Warmup failed`: 正常，预热失败不影响主流程
- 继续观察后续查询延迟

---

## 📊 关键指标监控

### 2-3分钟后检查

期望在日志中看到：

```
[Worker 0] 📊 Latency Statistics (Last 100 queries)
[Worker 0] 📊 Outbound (SOL→Bridge): avg 350-400ms  ← 应该从642ms降低
[Worker 0] 📊 Return (Bridge→SOL):   avg 330-380ms  ← 应该从614ms降低
[Worker 0] 📊 Success Rate:          95%+
```

---

## ✅ 成功标准

| 指标 | 优化前 | 优化后（目标） | 状态 |
|-----|-------|--------------|------|
| Worker 0平均延迟 | 628ms | < 420ms | ⏳ 待验证 |
| Worker 1平均延迟 | 548ms | < 370ms | ⏳ 待验证 |
| 连接复用率 | ~60% | > 85% | ⏳ 待验证 |
| 查询成功率 | 95%+ | 95%+ | ⏳ 待验证 |
| 429错误 | 0 | 0 | ⏳ 待验证 |

---

## ⚠️ 异常处理

### 如果延迟没有明显改善

1. **检查代理稳定性**
   ```
   如果看到大量 "ECONNRESET" 错误
   → 代理可能不支持高频keep-alive
   → 考虑调整 keepAliveMsecs 至 100ms
   ```

2. **检查超时率**
   ```
   如果看到大量 "Timeout" 标记
   → 1500ms超时可能太短
   → 考虑调整 timeout 至 2000ms
   ```

3. **检查连接数限制**
   ```
   如果看到连接错误
   → 代理可能限制连接数
   → 考虑降低 maxSockets 至 10
   ```

### 快速回滚命令

如果需要恢复原配置：
```bash
# 方案1: 使用备份
cp packages/jupiter-bot/src/workers/query-worker.ts.backup packages/jupiter-bot/src/workers/query-worker.ts
pnpm run build
.\start-flashloan-dryrun.bat

# 方案2: 切换回main分支
git checkout main
pnpm run build
.\start-flashloan-dryrun.bat
```

---

## 📝 测试记录模板

请在测试后记录以下数据：

```
测试时间: _____________
测试时长: _____________

延迟数据:
- Worker 0平均: _____ ms (优化前: 628ms)
- Worker 1平均: _____ ms (优化前: 548ms)
- P95延迟: _____ ms (优化前: ~850ms)

连接数据:
- 预热成功连接数: _____ / 10
- 连接复用率: _____%

稳定性:
- 查询成功率: _____%
- 429错误次数: _____
- ECONNRESET错误: _____

结论:
□ 优化成功，延迟降低 ____%
□ 优化部分成功，需微调
□ 优化失败，需回滚
```

---

## 🎯 下一步行动

### 如果测试成功（延迟降低30%+）

1. ✅ 继续运行24小时，验证长期稳定性
2. ✅ 记录性能对比数据
3. ✅ 准备合并到main分支

### 如果测试部分成功（延迟降低15-30%）

1. 🔧 微调参数（keepAliveMsecs, maxSockets, timeout）
2. 🔧 分析日志找出瓶颈
3. 🔧 迭代优化

### 如果测试失败（延迟无明显改善）

1. ⚠️ 立即回滚到原配置
2. 📊 收集失败日志和数据
3. 🔍 分析失败原因

---

**优化版本**: v2.0  
**分支**: feature/ultra-api-latency-optimization  
**预期效果**: 延迟降低35-40%  
**风险级别**: 低（可快速回滚）


