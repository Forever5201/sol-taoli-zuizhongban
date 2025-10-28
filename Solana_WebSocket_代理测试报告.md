# Solana WebSocket 代理连接测试报告

## 测试概述

本报告记录了对 Solana WebSocket API 通过 Clash VPN (端口 7890) 连接的测试过程和结果。

## 测试环境

- **操作系统**: Windows
- **代理服务器**: Clash VPN
- **代理端口**: 7890
- **测试目标**: wss://api.mainnet-beta.solana.com

## 测试结果

### 1. 直接连接测试 (不使用代理)

**结果**: ❌ 失败
```
WebSocketError: 由于连接方在一段时间后没有正确答复或连接的主机没有反应，连接尝试失败。 (os error 10060)
```

### 2. 代理连接测试 (使用 Clash VPN)

**HTTP 代理连接**: ✅ 成功
- 通过 PowerShell 的 `Invoke-WebRequest` 命令测试
- 成功获取到 Solana RPC 服务的响应页面

**WebSocket 代理连接**: ❌ 失败
- 使用 websocat 工具测试
- 即使设置了代理环境变量，连接仍然失败

## 问题分析

1. **直接连接失败**: 表明您的网络环境无法直接访问 Solana WebSocket API，可能是由于网络限制或防火墙设置。

2. **HTTP 代理成功**: 确认 Clash VPN 正常工作，并且能够代理 HTTP/HTTPS 请求。

3. **WebSocket 代理失败**: 可能的原因：
   - websocat 工具可能不支持或无法正确使用 HTTP 代理环境变量
   - Clash VPN 可能需要特殊配置才能支持 WebSocket 代理
   - WebSocket 连接可能需要专门的代理配置

## 解决方案

### 方案 1: 使用项目内置的代理配置

您的项目已经包含了完整的代理配置系统，可以正确处理 WebSocket 代理连接：

1. 确认 `.env` 文件中的代理配置：
   ```bash
   HTTP_PROXY=http://127.0.0.1:7890
   HTTPS_PROXY=http://127.0.0.1:7890
   WS_PROXY=http://127.0.0.1:7890
   NO_PROXY=localhost,127.0.0.1
   ```

2. 运行项目中的机器人，它会自动使用代理：
   ```bash
   npm run start:onchain-bot
   ```

### 方案 2: 配置 Clash VPN 支持 WebSocket

1. 打开 Clash VPN 配置
2. 确认已启用 "Allow LAN" 和 "Mixed Port" 设置
3. 检查是否有专门的 WebSocket 代理配置选项

### 方案 3: 使用其他代理工具

如果 Clash VPN 无法支持 WebSocket 代理，可以考虑：
- V2Ray (通常对 WebSocket 支持更好)
- Shadowsocks with plugin
- 专门的 SOCKS5 代理

## 测试工具

我们创建了以下测试工具，您可以使用它们进行进一步测试：

1. **test-websocket-proxy.js**: 完整的 Node.js WebSocket 代理测试脚本
2. **test-websocket-simple.js**: 简化版测试脚本
3. **test-websocket-final.bat**: Windows 批处理测试脚本

## 建议

1. **使用项目内置的代理系统**: 您的项目已经实现了完整的代理支持，包括 WebSocket 连接。这是最可靠的解决方案。

2. **检查 Clash VPN 配置**: 确认 Clash VPN 是否正确配置了 WebSocket 代理支持。

3. **考虑替代代理工具**: 如果 Clash VPN 无法满足需求，可以考虑使用对 WebSocket 支持更好的代理工具。

4. **防火墙设置**: 检查 Windows 防火墙是否阻止了 WebSocket 连接。

## 相关文档

- `docs/代理配置快速指南.md`
- `docs/config/PROXY_SETUP.md`
- `packages/core/src/config/proxy-config.ts`
- `packages/core/src/network/proxy-config.ts`

---

**测试日期**: 2025-10-26  
**测试人员**: AI Assistant  
**状态**: 部分成功 (HTTP 代理工作，WebSocket 代理需要进一步配置)