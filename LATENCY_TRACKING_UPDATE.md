# 延迟追踪功能更新报告

## ✅ 完成的修改

### **1. 添加独立延迟计时**

**修改文件**：`packages/jupiter-bot/src/workers/query-worker.ts`

**修改内容**：
```typescript
// 之前：只记录并行总延迟
const parallelLatency = Date.now() - parallelStart;

// 现在：分别记录去程和回程延迟
let outboundStartTime: number, outboundEndTime: number;
let returnStartTime: number, returnEndTime: number;

const [responseOut, responseBack] = await Promise.all([
  (async () => {
    outboundStartTime = Date.now();
    const response = await axios.get(...);
    outboundEndTime = Date.now();
    return response;
  })(),
  (async () => {
    returnStartTime = Date.now();
    const response = await axios.get(...);
    returnEndTime = Date.now();
    return response;
  })()
]);

const outboundMs = outboundEndTime! - outboundStartTime!;
const returnMs = returnEndTime! - returnStartTime!;
```

---

### **2. 更新返回的latency对象**

**之前**：
```typescript
latency: {
  parallelMs: parallelLatency,
  estimatedBridgeAmount,
  actualBridgeAmount,
}
```

**现在**：
```typescript
latency: {
  parallelMs: parallelLatency,
  outboundMs: outboundMs,      // ✅ 新增
  returnMs: returnMs,          // ✅ 新增
  estimatedBridgeAmount,
  actualBridgeAmount,
}
```

---

### **3. 增强日志输出**

**之前**：
```
[Worker 0] ⚡ Parallel query: 557ms, estimate=..., actual=...
```

**现在**：
```
[Worker 0] ⚡ Parallel query: 557ms (out:285ms, ret:272ms), estimate=..., actual=...
                                      ^^^^^^^^  ^^^^^^^^
                                      去程延迟  回程延迟
```

---

## 📊 预期效果

### **数据库记录**
下次运行后，`opportunity_validations`表的这两个字段将有值：
- `first_outbound_ms`：Worker去程查询延迟
- `first_return_ms`：Worker回程查询延迟

### **可以进行的分析**

#### **1. 串行 vs 并行对比**
```sql
-- 昨天（串行）
SELECT 
  '昨天(串行)' as type,
  AVG(first_outbound_ms + first_return_ms) as serial_total
FROM opportunity_validations
WHERE first_detected_at >= '2025-10-24 08:53:00' 
  AND first_detected_at <= '2025-10-24 23:54:00';

-- 今天（并行）
SELECT 
  '今天(并行)' as type,
  AVG(GREATEST(first_outbound_ms, first_return_ms)) as parallel_total,
  AVG(first_outbound_ms + first_return_ms) as would_be_serial
FROM opportunity_validations
WHERE first_detected_at >= '2025-10-25 09:35:00';
```

#### **2. 节省时间计算**
```sql
SELECT 
  AVG(first_outbound_ms + first_return_ms) as serial_time,
  AVG(GREATEST(first_outbound_ms, first_return_ms)) as parallel_time,
  AVG(first_outbound_ms + first_return_ms - GREATEST(first_outbound_ms, first_return_ms)) as time_saved,
  AVG((first_outbound_ms + first_return_ms - GREATEST(first_outbound_ms, first_return_ms))::NUMERIC / 
      (first_outbound_ms + first_return_ms) * 100) as percent_saved
FROM opportunity_validations
WHERE first_detected_at >= '2025-10-25 09:35:00'
  AND first_outbound_ms IS NOT NULL
  AND first_return_ms IS NOT NULL;
```

#### **3. 并行效率分析**
```sql
-- 查看去程和回程谁更慢
SELECT 
  CASE 
    WHEN first_outbound_ms > first_return_ms THEN '去程更慢'
    WHEN first_return_ms > first_outbound_ms THEN '回程更慢'
    ELSE '相同'
  END as slower_leg,
  COUNT(*) as count,
  AVG(first_outbound_ms) as avg_outbound,
  AVG(first_return_ms) as avg_return,
  AVG(ABS(first_outbound_ms - first_return_ms)) as avg_diff
FROM opportunity_validations
WHERE first_detected_at >= '2025-10-25 09:35:00'
  AND first_outbound_ms IS NOT NULL
  AND first_return_ms IS NOT NULL
GROUP BY 
  CASE 
    WHEN first_outbound_ms > first_return_ms THEN '去程更慢'
    WHEN first_return_ms > first_outbound_ms THEN '回程更慢'
    ELSE '相同'
  END;
```

---

## 🧪 测试步骤

### **步骤1：重启Bot**
```bash
pnpm run start:flashloan-dryrun
```

### **步骤2：观察新日志格式**
等待几轮查询后，应该看到：
```
[Worker 0] ⚡ Parallel query: 454ms (out:230ms, ret:224ms), estimate=1850000000, actual=1940136980, profit=0.000897 SOL, ratio=194.01
                                      ^^^^^^^^  ^^^^^^^^
                                      这两个值应该显示！
```

### **步骤3：检查数据库**
运行一段时间后（至少发现1个机会），查询数据库：
```sql
SELECT 
  first_detected_at,
  first_outbound_ms,
  first_return_ms,
  GREATEST(first_outbound_ms, first_return_ms) as parallel_total,
  first_outbound_ms + first_return_ms as serial_total,
  first_profit,
  second_profit,
  still_exists
FROM opportunity_validations
WHERE first_detected_at >= '2025-10-25 09:35:00'
ORDER BY first_detected_at DESC
LIMIT 10;
```

**预期结果**：`first_outbound_ms`和`first_return_ms`应该有值（不是NULL）

---

## 📈 与之前数据对比

### **昨天的数据（串行查询）**
```
平均去程延迟：485ms
平均回程延迟：510ms
串行总延迟：  996ms
```

### **今天的数据（并行查询，从日志推断）**
```
并行总延迟：  454ms
理论去程延迟：约230ms（估计）
理论回程延迟：约224ms（估计）
节省时间：    542ms (54%)
```

### **修改后将获得准确数据**
运行新代码后，我们可以准确知道：
1. 去程和回程各自的延迟
2. 哪一个查询更慢（决定总延迟）
3. 并行查询的真实效率

---

## 🎯 分析目标

通过这次修改，我们可以回答：

### **关于性能**
- ✅ 并行查询真的节省了多少时间？
- ✅ 去程和回程哪个是瓶颈？
- ✅ 并行查询的效率如何？（理想情况下应该是MAX(out, ret)）

### **关于通过率**
- ✅ Worker第一次查询延迟是否影响通过率？
- ✅ 延迟变化是否与通过率相关？
- ✅ 串行vs并行对机会发现的影响

---

## 💡 后续建议

### **如果数据显示去程比回程慢很多**
```
例如：out:400ms, ret:150ms
```
可以考虑：
1. 去程优先查询（不并行）
2. 优化去程路由

### **如果数据显示并行效率不高**
```
例如：out:300ms, ret:290ms, parallel:350ms (预期300ms)
```
说明有额外开销，可能需要优化Promise.all

### **如果数据显示延迟与通过率无关**
说明通过率下降确实是市场特性，不是技术问题

---

## 📝 编译状态

✅ **代码已修改完成**
✅ **项目已重新编译**（`pnpm run build` 成功）
✅ **可以重启Bot进行测试**

---

**下一步**：重启Bot，观察新的日志格式和数据库记录！🚀

