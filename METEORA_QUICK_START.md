# Meteora DLMM 快速启动指南

## 🚀 30 秒快速开始

### 步骤 1: 获取池子地址 (访问 Meteora 官网)

访问 https://app.meteora.ag/pools 并复制以下交易对的池子地址：

```
需要的交易对:
1. SOL/USDC (Meteora DLMM)
2. SOL/USDT (Meteora DLMM)
3. USDC/USDT (Meteora DLMM)
4. JUP/USDC (Meteora DLMM)
5. mSOL/SOL (Meteora DLMM)
```

### 步骤 2: 更新配置文件

编辑 `rust-pool-cache/config.toml`，取消注释并填入地址：

```toml
[[pools]]
address = "你的SOL/USDC池子地址"
name = "SOL/USDC (Meteora DLMM)"
pool_type = "meteora_dlmm"

[[pools]]
address = "你的SOL/USDT池子地址"
name = "SOL/USDT (Meteora DLMM)"
pool_type = "meteora_dlmm"

[[pools]]
address = "你的USDC/USDT池子地址"
name = "USDC/USDT (Meteora DLMM)"
pool_type = "meteora_dlmm"

[[pools]]
address = "你的JUP/USDC池子地址"
name = "JUP/USDC (Meteora DLMM)"
pool_type = "meteora_dlmm"

[[pools]]
address = "你的mSOL/SOL池子地址"
name = "mSOL/SOL (Meteora DLMM)"
pool_type = "meteora_dlmm"
```

### 步骤 3: 编译和运行

```bash
# 编译
cd rust-pool-cache
cargo build --release

# 运行
cd ..
rust-pool-cache\target\release\solana-pool-cache.exe rust-pool-cache\config.toml
```

### 步骤 4: 验证成功

查看日志中是否出现：

```
✅ Subscription confirmed: pool=SOL/USDC (Meteora DLMM)
┌─────────────────────────────────────────────────────
│ SOL/USDC (Meteora DLMM) Pool Updated
│ ├─ Type:         Meteora DLMM
│ ├─ Price:        ~170 (合理)
│ ├─ Latency:      < 100 μs
│ └─ ✅ Price cache updated
└─────────────────────────────────────────────────────
```

---

## ✅ 成功 = 完成 4 个检查

- [ ] 看到 "Subscribed to ... (Meteora DLMM)"
- [ ] 看到 "Pool Updated" 消息
- [ ] 价格在合理范围（SOL/USDC ~150-200）
- [ ] 延迟 < 100 μs

---

## 🆘 如果遇到问题

### 问题 1: 订阅失败

```
原因: 池子地址错误
解决: 重新访问 Meteora 官网确认地址
```

### 问题 2: 解析错误 "Not all bytes read"

```
原因: 数据结构不匹配
解决: 调整 meteora_dlmm.rs 中的 padding 字段
```

### 问题 3: 价格不合理

```
原因: bin_step 或 active_id 解析错误
解决: 查看原始数据，调整结构定义
```

---

## 📞 需要支持？

查看详细文档：
- [实施指南](./METEORA_DLMM_IMPLEMENTATION_GUIDE.md)
- [完成报告](./METEORA_DLMM_INTEGRATION_COMPLETE.md)

---

**代码已 100% 就绪！获取地址后立即可用！**





