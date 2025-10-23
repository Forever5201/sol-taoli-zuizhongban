# 微信推送BUG分析与修复方案

## 🐛 BUG根本原因

### 问题代码位置
**文件**: `packages/core/src/monitoring/service.ts`  
**方法**: `sendAlert()`  
**行数**: 162-165

```typescript
async sendAlert(alert: Alert): Promise<boolean> {
  if (!this.config.enabled || !this.config.webhookUrl) {
    return false;  // ← 🔥 BUG在这里！
  }
  // ...
}
```

### 问题分析

1. **`sendAlert()`方法要求`webhookUrl`（Discord Webhook）**
   - 即使您只配置了ServerChan（微信推送）
   - 也会因为没有`webhookUrl`而直接return false
   - **ServerChan的代码在后面，根本不会执行**

2. **正确的逻辑应该是**：
   - 只要配置了Discord **或** ServerChan，就应该发送
   - 而不是**必须**配置Discord

### 相关代码

```typescript
// 后面有ServerChan的代码（但永远不会执行到）
private async sendAlertNow(alert: Alert): Promise<boolean> {
  let discordSuccess = false;
  let serverChanSuccess = false;

  // 发送到 Discord（如果配置了）
  if (this.config.webhookUrl) {
    // Discord逻辑...
    discordSuccess = true;
  }

  // 发送到 Server酱（如果配置了）← 永远不会执行到这里
  if (this.serverChan?.isConfigValid()) {
    serverChanSuccess = await this.serverChan.send(alert);
  }

  return discordSuccess || serverChanSuccess;
}
```

---

## ✅ 修复方案

### 修复1：修改`sendAlert()`条件判断

**之前**：
```typescript
if (!this.config.enabled || !this.config.webhookUrl) {
  return false;
}
```

**修复后**：
```typescript
// 只要启用监控，且配置了Discord或ServerChan，就继续
if (!this.config.enabled) {
  return false;
}

// 如果既没有Discord也没有ServerChan，直接返回
if (!this.config.webhookUrl && !this.serverChan?.isConfigValid()) {
  return false;
}
```

---

## 🚀 完整实施方案

### 步骤1：修复sendAlert()方法

### 步骤2：添加二次验证推送方法

### 步骤3：在Bot中集成推送

### 步骤4：更新配置文件

---

## 📊 修复后的预期行为

| 配置情况 | 之前 | 修复后 |
|---------|------|--------|
| 只配置ServerChan | ❌ 不推送 | ✅ 推送到微信 |
| 只配置Discord | ✅ 推送到Discord | ✅ 推送到Discord |
| 两者都配置 | ✅ 推送到Discord | ✅ 推送到两者 |
| 两者都没配置 | ❌ 不推送 | ❌ 不推送 |

---

## 🎯 推送策略（按您的要求）

1. **❌ 关闭首次发现推送**
   ```toml
   alert_on_opportunity_found = false
   ```

2. **✅ 启用二次验证通过推送**（新增功能）
   ```toml
   alert_on_opportunity_validated = true
   min_validated_profit_for_alert = 2_000_000  # 0.002 SOL
   ```

3. **✅ 保留交易成功推送**（已有功能）
   ```toml
   alert_on_profit = true
   min_profit_for_alert = 2_000_000  # 0.002 SOL
   ```

---

## 📝 实施清单

- [ ] 修复`sendAlert()`方法的条件判断
- [ ] 添加`alertOpportunityValidated()`方法
- [ ] 在Bot的`handleOpportunity()`中集成推送
- [ ] 更新配置文件
- [ ] 测试验证

**预计时间**: 15-20分钟

