# Jupiter API Key 配置快速指南 🚀

## 📍 当前状态

✅ **您的 API Key 已成功配置！**

```toml
# configs/flashloan-dryrun.toml

[jupiter_api]
api_key = "3cf45ad3-12bc-4832-9307-d0b76357e005"
endpoint = "https://api.jup.ag/ultra"
```

---

## 🔍 如何验证配置

### 方法 1：查看启动日志

运行机器人时，会显示：

```
📡 Jupiter API: https://api.jup.ag/ultra
🔑 API Key: 3cf45ad3...
⚡ Dynamic Rate Limit: Enabled (5 RPS base, auto-scaling)
```

### 方法 2：运行测试

```bash
pnpm exec tsx -e "
import { FlashloanBot } from './packages/jupiter-bot/src/flashloan-bot';
const config = FlashloanBot.loadConfig('./configs/flashloan-dryrun.toml');
console.log('API Key:', config.jupiterApi?.apiKey?.slice(0,8) + '...');
console.log('Endpoint:', config.jupiterApi?.endpoint);
"
```

---

## 🔧 如何修改 API Key

### 步骤 1：打开配置文件

```bash
notepad configs\flashloan-dryrun.toml
```

### 步骤 2：修改 API Key

找到 `[jupiter_api]` 配置节：

```toml
[jupiter_api]
api_key = "YOUR_NEW_API_KEY_HERE"  # ← 修改这里
endpoint = "https://api.jup.ag/ultra"
```

### 步骤 3：保存并重启

```bash
.\start-flashloan-dryrun.bat
```

---

## 📊 API 使用情况

### 当前配置

| 项目 | 配置 |
|------|------|
| **API Key** | `3cf45ad3-12bc-4832-9307-d0b76357e005` |
| **端点** | `https://api.jup.ag/ultra` |
| **基础配额** | 5 RPS |
| **动态扩展** | ✅ 已启用 |
| **Worker 数量** | 2 |
| **查询间隔** | 300ms |
| **理论 RPS** | 2 × (1000/300) ≈ 6.67 RPS |

### 优化建议

**当前配置已优化**：
- ✅ Worker 数量：2（适中）
- ✅ 查询间隔：300ms（给代理足够缓冲）
- ⚠️ 理论 RPS (6.67) 略高于基础配额 (5 RPS)
- ✅ 动态限流会自动调整配额

**如果遇到限流**，可进一步降低并发：

```toml
[opportunity_finder]
worker_count = 1  # 降低到 1 个 worker
query_interval_ms = 250  # 1 × (1000/250) = 4 RPS < 5 RPS
```

---

## 🌐 获取新的 API Key

### 官方入口

访问：<https://portal.jup.ag/>

### 步骤

1. 登录或注册账号
2. 进入"密钥管理"
3. 点击"生成新密钥"
4. 复制 API Key 到配置文件

---

## 🔒 安全建议

### ✅ 推荐做法

1. **定期轮换**：每 3-6 个月更换一次 API Key
2. **监控使用**：在 <https://portal.jup.ag/> 查看 API 调用统计
3. **备份配置**：保存配置文件的副本（但不要提交到公开仓库）

### ❌ 禁止做法

1. ❌ 不要在公开代码仓库中分享 API Key
2. ❌ 不要将生产 API Key 用于测试
3. ❌ 不要与他人共享您的 API Key

---

## 🆘 常见问题

### Q1: API Key 配置错误怎么办？

**症状**：启动日志显示 `API Key: Not configured`

**解决**：
1. 检查 `configs/flashloan-dryrun.toml` 中是否有 `[jupiter_api]` 配置节
2. 确认 `api_key` 值是否正确（没有引号错误或空格）
3. 重启机器人

---

### Q2: 遇到 429 限流错误怎么办？

**症状**：日志中出现 `429 Too Many Requests`

**解决**：
```toml
[opportunity_finder]
worker_count = 1  # 降低并发
query_interval_ms = 300  # 增加间隔
```

---

### Q3: 动态限流如何工作？

**官方说明**：
- **基础配额**：5 RPS
- **自动扩展**：根据您的使用情况，配额会自动增加
- **无需操作**：系统自动管理，无需手动申请

**建议**：
- 起初保持较低的查询频率（4-5 RPS）
- 观察几天后，逐步提升到 6-8 RPS
- 监控日志，如果没有 429 错误，说明配额已扩展

---

### Q4: 免费版和付费版的区别？

| 项目 | 免费版（当前） | 专业版 |
|------|--------------|-------|
| **基础配额** | 5 RPS | 10+ RPS |
| **动态扩展** | ✅ 支持 | ✅ 支持 |
| **价格** | 免费 | 200 元/月 |
| **优先级** | 普通 | 高 |

**建议**：
- 免费版足够用于测试和小规模运行
- 如果需要更高频率，考虑升级专业版

---

## 📞 技术支持

### 官方渠道

- **文档**：<https://dev.jup.ag/docs>
- **API 门户**：<https://portal.jup.ag/>
- **Discord**：联系 Jupiter 官方技术支持

### 项目文档

- `JUPITER_API_KEY_MIGRATION_COMPLETE.md` - 完整迁移报告
- `configs/flashloan-dryrun.toml` - 配置文件
- `packages/jupiter-bot/src/flashloan-bot.ts` - 源代码

---

## ✅ 检查清单

启动前确认：

- [ ] ✅ API Key 已配置在 `configs/flashloan-dryrun.toml`
- [ ] ✅ 端点设置为 `https://api.jup.ag/ultra`
- [ ] ✅ Worker 数量 ≤ 2
- [ ] ✅ 查询间隔 ≥ 250ms
- [ ] ✅ 代理连接正常（如果使用代理）
- [ ] ✅ 钱包余额充足（如果非 dry run）

---

**现在您可以启动机器人了！**

```bash
.\start-flashloan-dryrun.bat
```

🎉 祝您套利成功！


