/**
 * 全局网络配置管理器
 * 
 * 统一管理代理配置，确保整个系统的网络请求一致性
 * 遵循单一职责原则：网络配置是基础设施层的职责
 * 
 * 使用方式：
 * ```typescript
 * import { networkConfig } from '@solana-arb-bot/core';
 * 
 * // 创建Solana连接
 * const connection = networkConfig.createConnection('https://api.mainnet-beta.solana.com');
 * 
 * // 获取axios实例
 * const axios = networkConfig.getAxiosInstance();
 * ```
 */

import { HttpsProxyAgent } from 'https-proxy-agent';
import axios, { AxiosInstance } from 'axios';
import { Connection, ConnectionConfig } from '@solana/web3.js';

/**
 * 网络配置管理器（单例模式）
 */
export class NetworkConfigManager {
  private static instance: NetworkConfigManager;
  private proxyUrl: string | null = null;
  private agent: any = null; // HttpsProxyAgent类型
  private axiosInstance: AxiosInstance | null = null;

  private constructor() {
    this.initialize();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): NetworkConfigManager {
    if (!NetworkConfigManager.instance) {
      NetworkConfigManager.instance = new NetworkConfigManager();
    }
    return NetworkConfigManager.instance;
  }

  /**
   * 初始化网络配置
   */
  private initialize() {
    // 从环境变量读取代理配置
    this.proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;

    if (this.proxyUrl) {
      // 创建代理agent
      this.agent = new HttpsProxyAgent(this.proxyUrl, {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
        timeout: 10000,
        keepAlive: true,
        keepAliveMsecs: 500,
        maxSockets: 10,
        maxFreeSockets: 5,
        scheduling: 'lifo',
      });

      console.log(`✅ [NetworkConfig] Global proxy configured: ${this.proxyUrl}`);
    } else {
      console.log(`ℹ️  [NetworkConfig] No proxy configured, using direct connection`);
    }

    // 创建全局axios实例
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip, deflate',
      },
      httpsAgent: this.agent || undefined,
      httpAgent: this.agent || undefined,
      proxy: false, // 禁用axios自动代理，使用我们的agent
      validateStatus: (status: number) => status < 500,
      maxRedirects: 0,
    });
  }

  /**
   * 获取配置好代理的axios实例
   * 
   * @returns {AxiosInstance} 配置了全局代理的axios实例
   */
  getAxiosInstance(): AxiosInstance {
    if (!this.axiosInstance) {
      throw new Error('NetworkConfigManager not initialized');
    }
    return this.axiosInstance;
  }

  /**
   * 创建配置好代理的Solana Connection
   * 
   * 注意：Solana Connection使用node-fetch，需要通过自定义fetch函数注入代理
   * 
   * @param endpoint - RPC端点URL
   * @param commitmentOrConfig - commitment级别或完整配置
   * @returns {Connection} 配置了全局代理的Connection
   */
  createConnection(
    endpoint: string,
    commitmentOrConfig?: ConnectionConfig | 'processed' | 'confirmed' | 'finalized'
  ): Connection {
    // 标准化配置
    const config: ConnectionConfig =
      typeof commitmentOrConfig === 'string'
        ? { commitment: commitmentOrConfig }
        : commitmentOrConfig || {};

    if (this.agent) {
      // 使用代理配置的自定义fetch
      const customFetch = (input: any, init?: any) => {
        const fetchOptions = {
          ...init,
          agent: this.agent,
        };
        return fetch(input, fetchOptions);
      };

      return new Connection(endpoint, {
        ...config,
        fetch: customFetch as any,
      });
    } else {
      // 无代理，使用默认fetch
      return new Connection(endpoint, config);
    }
  }

  /**
   * 获取HttpsProxyAgent（用于其他需要代理的场景）
   * 
   * @returns {any} 代理agent或null
   */
  getProxyAgent(): any {
    return this.agent;
  }

  /**
   * 检查是否启用了代理
   * 
   * @returns {boolean} true表示启用了代理
   */
  isProxyEnabled(): boolean {
    return this.proxyUrl !== null;
  }

  /**
   * 获取代理URL
   * 
   * @returns {string | null} 代理URL或null
   */
  getProxyUrl(): string | null {
    return this.proxyUrl;
  }

  /**
   * 创建自定义配置的axios实例（基于全局代理）
   * 
   * @param customConfig - 自定义axios配置
   * @returns {AxiosInstance} 合并了全局代理的axios实例
   */
  createCustomAxiosInstance(customConfig: any = {}): AxiosInstance {
    return axios.create({
      ...customConfig,
      httpsAgent: this.agent || customConfig.httpsAgent,
      httpAgent: this.agent || customConfig.httpAgent,
      proxy: false,
    });
  }
}

/**
 * 导出全局单例
 */
export const networkConfig = NetworkConfigManager.getInstance();

/**
 * 便捷导出：创建配置好代理的Connection
 */
export const createProxiedConnection = (
  endpoint: string,
  commitmentOrConfig?: ConnectionConfig | 'processed' | 'confirmed' | 'finalized'
): Connection => {
  return networkConfig.createConnection(endpoint, commitmentOrConfig);
};

/**
 * 便捷导出：获取配置好代理的axios实例
 */
export const getProxiedAxios = (): AxiosInstance => {
  return networkConfig.getAxiosInstance();
};

