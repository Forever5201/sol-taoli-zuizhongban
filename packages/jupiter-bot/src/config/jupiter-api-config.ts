/**
 * Jupiter API 配置
 * 
 * 支持本地 API 和远程 API 的切换和 fallback
 */

export interface JupiterApiConfig {
  /** 是否使用本地 API */
  useLocalApi: boolean;
  /** 本地 API 地址 */
  localApiUrl: string;
  /** 远程 Ultra API 地址 */
  remoteUltraApiUrl: string;
  /** 远程 Quote API 地址 */
  remoteQuoteApiUrl: string;
  /** 本地 API 失败时是否 fallback 到远程 */
  fallbackToRemote: boolean;
  /** API 超时时间（毫秒） */
  timeout: number;
}

export const jupiterApiConfig: JupiterApiConfig = {
  // 🔥 启用本地 API（延迟 <5ms）
  useLocalApi: process.env.USE_LOCAL_JUPITER_API === 'true' || true,
  
  // 本地 API 地址
  localApiUrl: process.env.JUPITER_LOCAL_API || 'http://localhost:8080',
  
  // 远程 API 地址（备份）
  remoteUltraApiUrl: 'https://api.jup.ag/ultra',
  remoteQuoteApiUrl: 'https://quote-api.jup.ag/v6',
  
  // 启用 fallback
  fallbackToRemote: true,
  
  // 本地 API 超时（毫秒）
  timeout: 5000, // 本地应该很快
};

/**
 * 获取当前 Jupiter API URL
 */
export function getJupiterApiUrl(): string {
  return jupiterApiConfig.useLocalApi 
    ? jupiterApiConfig.localApiUrl 
    : jupiterApiConfig.remoteUltraApiUrl;
}

/**
 * 获取 API 端点路径
 * 本地 API 使用 /quote，远程 Ultra API 使用 /v1/order
 */
export function getQuoteEndpoint(): string {
  return jupiterApiConfig.useLocalApi 
    ? '/quote'  // 本地 API 使用标准 v6 格式
    : '/v1/order';  // Ultra API
}

/**
 * 获取 swap-instructions 端点
 */
export function getSwapInstructionsEndpoint(): string {
  return '/swap-instructions'; // 两者都一样
}

/**
 * 日志当前配置
 */
export function logJupiterApiConfig(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Jupiter API Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Mode:         ${jupiterApiConfig.useLocalApi ? '🟢 LOCAL API' : '🔴 REMOTE API'}`);
  console.log(`API URL:      ${getJupiterApiUrl()}`);
  console.log(`Quote Path:   ${getQuoteEndpoint()}`);
  console.log(`Fallback:     ${jupiterApiConfig.fallbackToRemote ? 'Enabled ✅' : 'Disabled ❌'}`);
  console.log(`Timeout:      ${jupiterApiConfig.timeout}ms`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}


