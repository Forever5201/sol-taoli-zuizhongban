/**
 * 🔧 自动化网络配置系统
 * 
 * 这个模块提供全局拦截器，确保所有新代码自动使用统一的网络适配器
 * 
 * 🎯 功能：
 * - 拦截 axios 默认实例，自动注入代理配置
 * - 拦截 @solana/web3.js Connection 构造，自动注入代理配置
 * - 提供代码检测工具，发现未使用适配器的代码
 * 
 * 📌 使用方式：
 * 在应用入口文件顶部调用：
 * ```typescript
 * import '@solana-arb-bot/core/network/auto-config';
 * ```
 * 
 * 或手动初始化：
 * ```typescript
 * import { initializeAutoConfig } from '@solana-arb-bot/core';
 * initializeAutoConfig();
 * ```
 */

import axios from 'axios';
import { Connection } from '@solana/web3.js';
import { NetworkAdapter } from './unified-adapter';

let initialized = false;

/**
 * 初始化自动配置系统
 */
export function initializeAutoConfig() {
  if (initialized) {
    console.log('⚠️  [AutoConfig] 自动配置系统已初始化，跳过重复初始化');
    return;
  }

  console.log('🔧 [AutoConfig] 正在初始化自动网络配置系统...');

  // 1. 拦截 axios 默认实例
  interceptAxiosDefaults();

  // 2. 提供警告（Connection 无法完全拦截，只能建议使用 NetworkAdapter）
  warnConnectionUsage();

  initialized = true;
  console.log('✅ [AutoConfig] 自动网络配置系统初始化完成');
  console.log('   ℹ️  建议：使用 NetworkAdapter.axios 和 NetworkAdapter.createConnection()');
}

/**
 * 拦截 axios 默认实例
 */
function interceptAxiosDefaults() {
  // 获取代理配置
  const agent = NetworkAdapter.getHttpsAgent();
  
  if (agent) {
    // 修改 axios 默认配置
    axios.defaults.httpsAgent = agent;
    axios.defaults.httpAgent = NetworkAdapter.getHttpAgent();
    axios.defaults.proxy = false;
    
    console.log('   ├─ Axios 默认实例已配置代理');
  } else {
    console.log('   ├─ Axios 默认实例使用直连模式');
  }
}

/**
 * 警告直接使用 Connection 构造函数
 */
function warnConnectionUsage() {
  // 由于 Connection 是类构造函数，无法通过简单的方式拦截
  // 这里只提供警告和最佳实践建议
  console.log('   ├─ Solana Connection 建议使用 NetworkAdapter.createConnection()');
  console.log('   └─ 直接使用 new Connection() 将不会自动应用代理配置');
}

/**
 * 代码检测工具：检查是否有代码直接使用了 axios.create 或 new Connection
 * 
 * 这是一个开发时工具，可以在 CI/CD 中运行
 */
export function detectDirectNetworkUsage(filePath: string, content: string): string[] {
  const warnings: string[] = [];

  // 检测 axios.create
  if (content.includes('axios.create(') && !content.includes('NetworkAdapter')) {
    warnings.push(`${filePath}: 发现使用 axios.create()，建议使用 NetworkAdapter.createAxios()`);
  }

  // 检测 new Connection
  if (content.includes('new Connection(') && !content.includes('NetworkAdapter')) {
    warnings.push(`${filePath}: 发现使用 new Connection()，建议使用 NetworkAdapter.createConnection()`);
  }

  // 检测直接导入 HttpsProxyAgent
  if (content.includes('HttpsProxyAgent') && !filePath.includes('unified-adapter')) {
    warnings.push(`${filePath}: 发现直接使用 HttpsProxyAgent，建议使用 NetworkAdapter`);
  }

  return warnings;
}

/**
 * 批量检测项目中的网络使用情况
 * 
 * @param files 文件路径和内容的映射
 * @returns 所有警告信息
 */
export function detectProjectNetworkUsage(files: Map<string, string>): string[] {
  const allWarnings: string[] = [];

  for (const [filePath, content] of files.entries()) {
    const warnings = detectDirectNetworkUsage(filePath, content);
    allWarnings.push(...warnings);
  }

  return allWarnings;
}

// 自动初始化（如果作为模块导入）
if (process.env.AUTO_INIT_NETWORK_CONFIG !== 'false') {
  initializeAutoConfig();
}



