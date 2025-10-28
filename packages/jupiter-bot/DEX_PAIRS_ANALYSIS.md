# 🏊 中间代币使用的DEX和交易对分析

**生成时间**: 2025-10-26  
**分析说明**: 由于您的系统使用Jupiter聚合路由，metadata中没有存储具体池子地址，仅有DEX名称和交易对。

---

## ⚠️ 重要说明

**您的系统没有记录池子地址**

- Jupiter 聚合器会动态选择最优池子
- Metadata中只记录了 DEX 名称和代币地址
- 要监控具体池子，需要：
  1. 从各个DEX获取该交易对的所有池子列表
  2. 按流动性排序，优先监控高流动性池子

---

## 📊 总览

- **不同DEX-交易对组合**: 199 个
- **涉及中间代币**: 17 个

---

## 1. USDC

**代币地址**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`  
**总使用次数**: 49,346 次

### 主要使用的DEX

- **SolFi V2**: 21,098 次 (42.8%)
- **AlphaQ**: 10,243 次 (20.8%)
- **HumidiFi**: 5,627 次 (11.4%)
- **TesseraV**: 5,296 次 (10.7%)
- **GoonFi**: 3,300 次 (6.7%)
- **Meteora DLMM**: 897 次 (1.8%)
- **Aquifer**: 529 次 (1.1%)
- **Stabble Stable Swap**: 434 次 (0.9%)
- **Raydium CLMM**: 349 次 (0.7%)
- **OKX DEX Router**: 299 次 (0.6%)

### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | SolFi V2 | USDT → USDC | 6,220 | 0.7441 SOL |
| 2 | AlphaQ | USDT → USDC | 6,042 | 0.6954 SOL |
| 3 | SolFi V2 | USDC → SOL | 5,632 | 1.1832 SOL |
| 4 | SolFi V2 | SOL → USDC | 5,120 | 4.1803 SOL |
| 5 | SolFi V2 | USDC → USDT | 4,126 | 0.1072 SOL |
| 6 | TesseraV | USDC → SOL | 3,841 | 1.6233 SOL |
| 7 | AlphaQ | USDC → USDT | 3,755 | 1.7772 SOL |
| 8 | HumidiFi | SOL → USDC | 3,038 | 0.5088 SOL |
| 9 | HumidiFi | USDC → SOL | 2,576 | 3.1578 SOL |
| 10 | GoonFi | USDC → SOL | 1,855 | 0.0657 SOL |

**💡 监控建议**: 
该代币在 **36** 个不同DEX上被使用。建议监控以下交易对的高流动性池子：
- USDT → USDC
- USDC → SOL
- SOL → USDC
- USDC → USDT

---

## 2. USDT

**代币地址**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`  
**总使用次数**: 27,245 次

### 主要使用的DEX

- **SolFi V2**: 10,346 次 (38.0%)
- **AlphaQ**: 9,797 次 (36.0%)
- **HumidiFi**: 2,550 次 (9.4%)
- **Lifinity V2**: 2,246 次 (8.2%)
- **Raydium CLMM**: 645 次 (2.4%)
- **Stabble Stable Swap**: 558 次 (2.0%)
- **OKX DEX Router**: 312 次 (1.1%)
- **Whirlpool**: 234 次 (0.9%)
- **PancakeSwap**: 174 次 (0.6%)
- **Aquifer**: 150 次 (0.6%)

### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | SolFi V2 | USDT → USDC | 6,220 | 0.7441 SOL |
| 2 | AlphaQ | USDT → USDC | 6,042 | 0.6954 SOL |
| 3 | SolFi V2 | USDC → USDT | 4,126 | 0.1072 SOL |
| 4 | AlphaQ | USDC → USDT | 3,755 | 1.7772 SOL |
| 5 | Lifinity V2 | SOL → USDT | 2,074 | 0.0010 SOL |
| 6 | HumidiFi | SOL → USDT | 1,376 | 0.0012 SOL |
| 7 | HumidiFi | USDT → SOL | 1,174 | 2.8547 SOL |
| 8 | Raydium CLMM | SOL → USDT | 486 | 15.8326 SOL |
| 9 | Stabble Stable Swap | USDT → USDC | 220 | 3.9829 SOL |
| 10 | Lifinity V2 | USDT → SOL | 172 | 28.7791 SOL |

**💡 监控建议**: 
该代币在 **18** 个不同DEX上被使用。建议监控以下交易对的高流动性池子：
- USDT → USDC
- USDC → USDT
- SOL → USDT
- USDT → SOL

---

## 3. USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB

**代币地址**: `USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB`  
**总使用次数**: 1,178 次

### 主要使用的DEX

- **AlphaQ**: 397 次 (33.7%)
- **Raydium CLMM**: 304 次 (25.8%)
- **Stabble Stable Swap**: 226 次 (19.2%)
- **Raydium**: 105 次 (8.9%)
- **PancakeSwap**: 90 次 (7.6%)
- **Meteora DLMM**: 37 次 (3.1%)
- **Whirlpool**: 18 次 (1.5%)
- **Raydium AMM**: 1 次 (0.1%)

### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | AlphaQ | USDC → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB | 205 | 0.0049 SOL |
| 2 | AlphaQ | USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → USDC | 192 | 0.0032 SOL |
| 3 | Raydium CLMM | SOL → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB | 180 | 0.0018 SOL |
| 4 | Raydium CLMM | USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → SOL | 117 | 0.0039 SOL |
| 5 | Stabble Stable Swap | USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → USDT | 116 | 0.0040 SOL |
| 6 | Raydium | USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → SOL | 69 | 0.0048 SOL |
| 7 | PancakeSwap | SOL → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB | 62 | 0.0013 SOL |
| 8 | Stabble Stable Swap | USDT → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB | 52 | 0.0046 SOL |
| 9 | Raydium | SOL → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB | 36 | 0.0095 SOL |
| 10 | Stabble Stable Swap | USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → USDC | 35 | 0.0102 SOL |

**💡 监控建议**: 
该代币在 **8** 个不同DEX上被使用。建议监控以下交易对的高流动性池子：
- USDC → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB
- USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → USDC
- SOL → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB
- USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → SOL
- USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → USDT

---

## 4. 2b1k...4GXo

**代币地址**: `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo`  
**总使用次数**: 127 次

### 主要使用的DEX

- **Whirlpool**: 44 次 (34.6%)
- **AlphaQ**: 39 次 (30.7%)
- **Stabble Stable Swap**: 36 次 (28.3%)
- **Perena**: 7 次 (5.5%)
- **Raydium CLMM**: 1 次 (0.8%)

### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | AlphaQ | USDC → 2b1k...4GXo | 28 | 0.0007 SOL |
| 2 | Whirlpool | 2b1k...4GXo → SOL | 27 | 0.0057 SOL |
| 3 | Stabble Stable Swap | 2b1k...4GXo → USDT | 20 | 0.0008 SOL |
| 4 | Whirlpool | SOL → 2b1k...4GXo | 17 | 0.0008 SOL |
| 5 | AlphaQ | 2b1k...4GXo → USDC | 11 | 0.0030 SOL |
| 6 | Stabble Stable Swap | USDC → 2b1k...4GXo | 7 | 0.0010 SOL |
| 7 | Perena | USDT → 2b1k...4GXo | 6 | 0.0263 SOL |
| 8 | Stabble Stable Swap | 2b1k...4GXo → USDC | 4 | 0.0004 SOL |
| 9 | Stabble Stable Swap | USDT → 2b1k...4GXo | 4 | 0.0013 SOL |
| 10 | Perena | 2b1k...4GXo → USDC | 1 | 0.0001 SOL |

**💡 监控建议**: 
该代币在 **5** 个不同DEX上被使用。建议监控以下交易对的高流动性池子：
- USDC → 2b1k...4GXo
- 2b1k...4GXo → SOL
- 2b1k...4GXo → USDT
- SOL → 2b1k...4GXo
- 2b1k...4GXo → USDC

---

## 5. Dz9m...bonk

**代币地址**: `Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk`  
**总使用次数**: 71 次

### 主要使用的DEX

- **Tessera V**: 30 次 (42.3%)
- **Meteora DLMM**: 24 次 (33.8%)
- **Raydium CP**: 10 次 (14.1%)
- **Whirlpools**: 5 次 (7.0%)
- **Aquifer**: 2 次 (2.8%)

### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | Tessera V | Dz9m...bonk → USDC | 22 | 0.0075 SOL |
| 2 | Meteora DLMM | SOL → Dz9m...bonk | 17 | 0.0068 SOL |
| 3 | Tessera V | USDC → Dz9m...bonk | 8 | 0.0055 SOL |
| 4 | Raydium CP | SOL → Dz9m...bonk | 8 | 0.0098 SOL |
| 5 | Meteora DLMM | Dz9m...bonk → SOL | 4 | 0.0046 SOL |
| 6 | Whirlpools | SOL → Dz9m...bonk | 3 | 0.0096 SOL |
| 7 | Raydium CP | Dz9m...bonk → SOL | 2 | 0.0094 SOL |
| 8 | Meteora DLMM | USDT → Dz9m...bonk | 2 | 0.0100 SOL |
| 9 | Whirlpools | Dz9m...bonk → SOL | 2 | 0.0034 SOL |
| 10 | Aquifer | Dz9m...bonk → USDC | 2 | 0.0138 SOL |

**💡 监控建议**: 
该代币在 **5** 个不同DEX上被使用。建议监控以下交易对的高流动性池子：
- Dz9m...bonk → USDC
- SOL → Dz9m...bonk
- USDC → Dz9m...bonk
- Dz9m...bonk → SOL
- USDT → Dz9m...bonk

---

## 6. 2u1t...jGWH

**代币地址**: `2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH`  
**总使用次数**: 45 次

### 主要使用的DEX

- **Stabble Stable Swap**: 41 次 (91.1%)
- **Whirlpool**: 2 次 (4.4%)
- **Raydium CLMM**: 1 次 (2.2%)
- **AlphaQ**: 1 次 (2.2%)

### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | Stabble Stable Swap | USDT → 2u1t...jGWH | 12 | 0.0012 SOL |
| 2 | Stabble Stable Swap | 2u1t...jGWH → USDT | 10 | 0.0022 SOL |
| 3 | Stabble Stable Swap | 2u1t...jGWH → USDC | 10 | 0.0007 SOL |
| 4 | Stabble Stable Swap | USDC → 2u1t...jGWH | 8 | 0.0014 SOL |
| 5 | Whirlpool | USDC → 2u1t...jGWH | 1 | 0.0007 SOL |
| 6 | Raydium CLMM | 2u1t...jGWH → USDT | 1 | 0.0007 SOL |
| 7 | AlphaQ | 2u1t...jGWH → USDC | 1 | 0.0061 SOL |
| 8 | Stabble Stable Swap | USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → 2u1t...jGWH | 1 | 0.0047 SOL |
| 9 | Whirlpool | 2u1t...jGWH → USDC | 1 | 0.0007 SOL |

**💡 监控建议**: 
该代币在 **4** 个不同DEX上被使用。建议监控以下交易对的高流动性池子：
- USDT → 2u1t...jGWH
- 2u1t...jGWH → USDT
- 2u1t...jGWH → USDC
- USDC → 2u1t...jGWH
- USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → 2u1t...jGWH

---

## 7. JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN

**代币地址**: `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`  
**总使用次数**: 26 次

### 主要使用的DEX

- **HumidiFi**: 10 次 (38.5%)
- **Whirlpools**: 6 次 (23.1%)
- **Meteora DLMM**: 6 次 (23.1%)
- **Aquifer**: 3 次 (11.5%)
- **ZeroFi**: 1 次 (3.8%)

### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | HumidiFi | USDC → JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN | 5 | 0.0058 SOL |
| 2 | HumidiFi | JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN → USDC | 5 | 0.0101 SOL |
| 3 | Whirlpools | SOL → JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN | 4 | 0.0098 SOL |
| 4 | Meteora DLMM | JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN → SOL | 4 | 0.0060 SOL |
| 5 | Whirlpools | JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN → SOL | 2 | 0.0052 SOL |
| 6 | Aquifer | USDT → JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN | 2 | 0.0088 SOL |
| 7 | Meteora DLMM | SOL → JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN | 2 | 0.0537 SOL |
| 8 | Aquifer | JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN → USDT | 1 | 0.0042 SOL |
| 9 | ZeroFi | JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN → USDC | 1 | 0.1049 SOL |

**💡 监控建议**: 
该代币在 **5** 个不同DEX上被使用。建议监控以下交易对的高流动性池子：
- USDC → JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
- JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN → USDC
- SOL → JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
- JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN → SOL
- USDT → JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN

---

## 8. USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA

**代币地址**: `USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA`  
**总使用次数**: 24 次

### 主要使用的DEX

- **AlphaQ**: 9 次 (37.5%)
- **Lifinity V2**: 5 次 (20.8%)
- **Saber**: 5 次 (20.8%)
- **Stabble Stable Swap**: 3 次 (12.5%)
- **Raydium CLMM**: 2 次 (8.3%)

### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | AlphaQ | USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA → USDC | 7 | 0.0199 SOL |
| 2 | Saber | USDT → USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA | 5 | 0.0319 SOL |
| 3 | Lifinity V2 | SOL → USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA | 3 | 0.0006 SOL |
| 4 | AlphaQ | USDC → USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA | 2 | 0.0229 SOL |
| 5 | Lifinity V2 | USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA → SOL | 2 | 0.0229 SOL |
| 6 | Raydium CLMM | SOL → USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA | 2 | 0.0052 SOL |
| 7 | Stabble Stable Swap | USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA → USDT | 2 | 0.0052 SOL |
| 8 | Stabble Stable Swap | USDC → USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA | 1 | 0.0222 SOL |

**💡 监控建议**: 
该代币在 **5** 个不同DEX上被使用。建议监控以下交易对的高流动性池子：
- USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA → USDC
- USDT → USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA
- SOL → USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA
- USDC → USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA
- USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA → SOL

---

## 9. ETH (Wormhole)

**代币地址**: `7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs`  
**总使用次数**: 13 次

### 主要使用的DEX

- **ZeroFi**: 6 次 (46.2%)
- **Meteora DLMM**: 3 次 (23.1%)
- **PancakeSwap**: 2 次 (15.4%)
- **Whirlpools**: 2 次 (15.4%)

### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | ZeroFi | ETH (Wormhole) → USDC | 5 | 0.0052 SOL |
| 2 | Meteora DLMM | SOL → ETH (Wormhole) | 2 | 0.0051 SOL |
| 3 | PancakeSwap | SOL → ETH (Wormhole) | 2 | 0.0059 SOL |
| 4 | Whirlpools | SOL → ETH (Wormhole) | 2 | 0.0040 SOL |
| 5 | ZeroFi | USDC → ETH (Wormhole) | 1 | 0.0078 SOL |
| 6 | Meteora DLMM | ETH (Wormhole) → SOL | 1 | 0.0078 SOL |

**💡 监控建议**: 
该代币在 **4** 个不同DEX上被使用。建议监控以下交易对的高流动性池子：
- ETH (Wormhole) → USDC
- SOL → ETH (Wormhole)
- USDC → ETH (Wormhole)
- ETH (Wormhole) → SOL

---

## 10. 6Frr...3tgG

**代币地址**: `6FrrzDk5mQARGc1TDYoyVnSyRdds1t4PbtohCD6p3tgG`  
**总使用次数**: 12 次

### 主要使用的DEX

- **Whirlpool**: 6 次 (50.0%)
- **Stabble Stable Swap**: 6 次 (50.0%)

### 使用的DEX-交易对组合 (Top 10)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | Whirlpool | USDT → 6Frr...3tgG | 6 | 0.0003 SOL |
| 2 | Stabble Stable Swap | 6Frr...3tgG → USDC | 6 | 0.0003 SOL |

---

## 🏆 最常用的DEX-交易对组合 (Top 50)

| 排名 | DEX | 交易对 | 使用次数 | 平均利润 |
|------|-----|--------|---------|----------|
| 1 | SolFi V2 | USDT → USDC | 6,220 | 0.7441 SOL |
| 2 | AlphaQ | USDT → USDC | 6,042 | 0.6954 SOL |
| 3 | SolFi V2 | USDC → SOL | 5,632 | 1.1832 SOL |
| 4 | SolFi V2 | SOL → USDC | 5,120 | 4.1803 SOL |
| 5 | SolFi V2 | USDC → USDT | 4,126 | 0.1072 SOL |
| 6 | TesseraV | USDC → SOL | 3,841 | 1.6233 SOL |
| 7 | AlphaQ | USDC → USDT | 3,755 | 1.7772 SOL |
| 8 | HumidiFi | SOL → USDC | 3,038 | 0.5088 SOL |
| 9 | HumidiFi | USDC → SOL | 2,576 | 3.1578 SOL |
| 10 | Lifinity V2 | SOL → USDT | 2,074 | 0.0010 SOL |
| 11 | GoonFi | USDC → SOL | 1,855 | 0.0657 SOL |
| 12 | TesseraV | SOL → USDC | 1,455 | 0.8056 SOL |
| 13 | GoonFi | SOL → USDC | 1,445 | 0.9859 SOL |
| 14 | HumidiFi | SOL → USDT | 1,376 | 0.0012 SOL |
| 15 | HumidiFi | USDT → SOL | 1,174 | 2.8547 SOL |
| 16 | Meteora DLMM | USDC → SOL | 543 | 0.0015 SOL |
| 17 | Raydium CLMM | SOL → USDT | 486 | 15.8326 SOL |
| 18 | Aquifer | USDC → SOL | 328 | 6.5696 SOL |
| 19 | Meteora DLMM | SOL → USDC | 327 | 0.0013 SOL |
| 20 | Stabble Stable Swap | USDT → USDC | 220 | 3.9829 SOL |
| 21 | AlphaQ | USDC → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB | 205 | 0.0049 SOL |
| 22 | AlphaQ | USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → USDC | 192 | 0.0032 SOL |
| 23 | Raydium CLMM | SOL → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB | 180 | 0.0018 SOL |
| 24 | Lifinity V2 | USDT → SOL | 172 | 28.7791 SOL |
| 25 | OKX DEX Router | USDC → SOL | 170 | 25.8195 SOL |
| 26 | Raydium CLMM | USDC → SOL | 169 | 0.0021 SOL |
| 27 | OKX DEX Router | USDT → SOL | 167 | 0.0091 SOL |
| 28 | Raydium CLMM | SOL → USDC | 165 | 0.0038 SOL |
| 29 | Whirlpool | USDC → SOL | 163 | 0.0019 SOL |
| 30 | Aquifer | SOL → USDC | 154 | 33.2432 SOL |
| 31 | Raydium CLMM | USDT → SOL | 146 | 5.9990 SOL |
| 32 | OKX DEX Router | SOL → USDT | 145 | 0.0080 SOL |
| 33 | Whirlpool | SOL → USDT | 132 | 0.0028 SOL |
| 34 | OKX DEX Router | SOL → USDC | 129 | 0.0064 SOL |
| 35 | JupiterZ | USDC → SOL | 127 | 0.0032 SOL |
| 36 | Stabble Stable Swap | USDC → USDT | 122 | 0.0036 SOL |
| 37 | Raydium CLMM | USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → SOL | 117 | 0.0039 SOL |
| 38 | Stabble Stable Swap | USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → USDT | 116 | 0.0040 SOL |
| 39 | PancakeSwap | USDC → SOL | 115 | 6.3627 SOL |
| 40 | Whirlpool | SOL → USDC | 105 | 0.0022 SOL |
| 41 | PancakeSwap | USDT → SOL | 95 | 0.0031 SOL |
| 42 | Byreal | USDC → SOL | 81 | 0.0009 SOL |
| 43 | PancakeSwap | SOL → USDT | 79 | 0.0022 SOL |
| 44 | Whirlpool | USDT → SOL | 78 | 0.0026 SOL |
| 45 | Lifinity V2 | USDC → SOL | 77 | 0.0023 SOL |
| 46 | Lifinity V2 | SOL → USDC | 75 | 0.0041 SOL |
| 47 | Raydium | USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → SOL | 69 | 0.0048 SOL |
| 48 | JupiterZ | SOL → USDC | 66 | 0.0081 SOL |
| 49 | JupiterZ | SOL → USDT | 64 | 0.0091 SOL |
| 50 | Aquifer | USDT → SOL | 64 | 8.7377 SOL |

---

## 💡 如何获取具体池子地址

### 方法 1: 使用 Jupiter API

对于每个高频使用的交易对，调用 Jupiter API 获取可用池子列表：

```bash
# 例如：查询 SOL → USDC 的所有池子
curl "https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000"
```

返回的路由信息中包含具体的池子地址。

### 方法 2: 直接查询各DEX

根据上面的分析，您需要从以下DEX获取池子信息：

- **SolFi V2**: 21,098 次使用 (37.26%)
- **AlphaQ**: 10,244 次使用 (18.09%)
- **HumidiFi**: 8,177 次使用 (14.44%)
- **TesseraV**: 5,296 次使用 (9.35%)
- **GoonFi**: 3,300 次使用 (5.83%)
- **Lifinity V2**: 2,403 次使用 (4.24%)
- **Raydium CLMM**: 1,285 次使用 (2.27%)
- **Meteora DLMM**: 980 次使用 (1.73%)
- **Stabble Stable Swap**: 652 次使用 (1.15%)
- **Aquifer**: 634 次使用 (1.12%)
- **OKX DEX Router**: 611 次使用 (1.08%)
- **Whirlpool**: 552 次使用 (0.97%)
- **PancakeSwap**: 425 次使用 (0.75%)
- **JupiterZ**: 319 次使用 (0.56%)
- **Byreal**: 127 次使用 (0.22%)
- **DefiTuna**: 115 次使用 (0.20%)
- **Raydium**: 114 次使用 (0.20%)
- **Meteora DAMM v2**: 58 次使用 (0.10%)
- **Orca V2**: 40 次使用 (0.07%)
- **ZeroFi**: 33 次使用 (0.06%)

### 方法 3: 从交易历史提取

如果您执行过交易，可以从 `trade_routes` 表或交易签名中提取实际使用的池子地址。

---

## 🎯 对 Rust Pool Cache 的具体建议

### 优先监控的交易对 (Top 20)

1. **USDC → SOL** - 15,846 次 (27.99%)
2. **USDT → USDC** - 12,543 次 (22.15%)
3. **SOL → USDC** - 12,292 次 (21.71%)
4. **USDC → USDT** - 8,041 次 (14.20%)
5. **SOL → USDT** - 4,404 次 (7.78%)
6. **USDT → SOL** - 1,970 次 (3.48%)
7. **SOL → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB** - 283 次 (0.50%)
8. **USDC → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB** - 237 次 (0.42%)
9. **USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → USDC** - 234 次 (0.41%)
10. **USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → SOL** - 212 次 (0.37%)
11. **USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB → USDT** - 142 次 (0.25%)
12. **USDT → USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB** - 68 次 (0.12%)
13. **USDC → 2b1k...4GXo** - 36 次 (0.06%)
14. **SOL → Dz9m...bonk** - 28 次 (0.05%)
15. **2b1k...4GXo → SOL** - 27 次 (0.05%)
16. **Dz9m...bonk → USDC** - 24 次 (0.04%)
17. **2b1k...4GXo → USDT** - 20 次 (0.04%)
18. **SOL → 2b1k...4GXo** - 17 次 (0.03%)
19. **2b1k...4GXo → USDC** - 16 次 (0.03%)
20. **USDT → 2u1t...jGWH** - 12 次 (0.02%)

### 实施步骤

1. **确定高频交易对**: 使用上面的Top 20列表
2. **查询池子列表**: 使用Jupiter API或各DEX的SDK
3. **按流动性筛选**: 每个交易对选择流动性最高的3-5个池子
4. **配置Rust Pool Cache**: 将这些池子地址添加到config.toml

### 预估池子数量

- 如果每个Top 20交易对监控5个池子 = **100个池子**
- 覆盖多个DEX，每个交易对10个池子 = **200个池子**

这是一个可行的起点，可以覆盖您大部分的套利机会。

---

**报告结束**
