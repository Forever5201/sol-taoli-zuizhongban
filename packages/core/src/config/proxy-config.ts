/**
 * 代理配置模块
 * 
 * 为系统所有网络请求提供统一的代理配置
 * 支持: HTTP/HTTPS请求(axios)、WebSocket连接、Solana RPC连接
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { logger } from '../logger';

const proxyLogger = logger.child({ module: 'ProxyConfig' });

/**
 * 代理配置接口
 */
export interface ProxyConfig {
  /** HTTP代理 */
  httpProxy?: string;
  /** HTTPS代理 */
  httpsProxy?: string;
  /** WebSocket代理 */
  wsProxy?: string;
  /** 不使用代理的地址列表 */
  noProxy?: string[];
}

/**
 * 代理管理器
 */
export class ProxyManager {
  private static instance: ProxyManager;
  private config: ProxyConfig;
  private httpAgent?: HttpAgent | HttpsProxyAgent<string> | SocksProxyAgent;
  private httpsAgent?: HttpsAgent | HttpsProxyAgent<string> | SocksProxyAgent;

  private constructor() {
    this.config = this.loadProxyConfig();
    this.initializeAgents();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager();
    }
    return ProxyManager.instance;
  }

  /**
   * 从环境变量加载代理配置
   */
  private loadProxyConfig(): ProxyConfig {
    const config: ProxyConfig = {
      httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
      httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy,
      wsProxy: process.env.WS_PROXY || process.env.ws_proxy,
      noProxy: [],
    };

    // 解析NO_PROXY
    const noProxy = process.env.NO_PROXY || process.env.no_proxy;
    if (noProxy) {
      config.noProxy = noProxy.split(',').map((s) => s.trim());
    }

    // 如果没有设置HTTPS_PROXY，使用HTTP_PROXY
    if (!config.httpsProxy && config.httpProxy) {
      config.httpsProxy = config.httpProxy;
    }

    // 如果没有设置WS_PROXY，使用HTTP_PROXY
    if (!config.wsProxy && config.httpProxy) {
      config.wsProxy = config.httpProxy;
    }

    if (config.httpProxy || config.httpsProxy) {
      proxyLogger.info('代理配置已加载', {
        http: config.httpProxy ? this.maskProxyUrl(config.httpProxy) : 'none',
        https: config.httpsProxy ? this.maskProxyUrl(config.httpsProxy) : 'none',
        ws: config.wsProxy ? this.maskProxyUrl(config.wsProxy) : 'none',
      });
    }

    return config;
  }

  /**
   * 初始化HTTP/HTTPS代理Agent
   */
  private initializeAgents(): void {
    try {
      // HTTP Agent
      if (this.config.httpProxy) {
        if (this.config.httpProxy.startsWith('socks')) {
          this.httpAgent = new SocksProxyAgent(this.config.httpProxy);
        } else {
          this.httpAgent = new HttpsProxyAgent(this.config.httpProxy);
        }
        proxyLogger.debug('HTTP Agent 已初始化');
      }

      // HTTPS Agent
      if (this.config.httpsProxy) {
        if (this.config.httpsProxy.startsWith('socks')) {
          this.httpsAgent = new SocksProxyAgent(this.config.httpsProxy);
        } else {
          this.httpsAgent = new HttpsProxyAgent(this.config.httpsProxy);
        }
        proxyLogger.debug('HTTPS Agent 已初始化');
      }
    } catch (error) {
      proxyLogger.error('初始化代理Agent失败', error);
    }
  }

  /**
   * 检查URL是否应该绕过代理
   */
  private shouldBypassProxy(url: string): boolean {
    if (!this.config.noProxy || this.config.noProxy.length === 0) {
      return false;
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      return this.config.noProxy.some((pattern) => {
        // 精确匹配
        if (pattern === hostname) {
          return true;
        }
        // 通配符匹配
        if (pattern.startsWith('*.') && hostname.endsWith(pattern.slice(1))) {
          return true;
        }
        // 子域匹配
        if (hostname.endsWith(`.${pattern}`)) {
          return true;
        }
        return false;
      });
    } catch {
      return false;
    }
  }

  /**
   * 获取Axios配置
   */
  getAxiosConfig(url: string): any {
    if (this.shouldBypassProxy(url)) {
      return {};
    }

    const config: any = {};

    if (this.httpAgent) {
      config.httpAgent = this.httpAgent;
    }

    if (this.httpsAgent) {
      config.httpsAgent = this.httpsAgent;
    }

    // 如果配置了代理，设置proxy为false（使用Agent代替）
    if (this.config.httpProxy || this.config.httpsProxy) {
      config.proxy = false;
    }

    return config;
  }

  /**
   * 获取WebSocket代理配置
   */
  getWebSocketAgent(url: string): HttpAgent | HttpsAgent | HttpsProxyAgent<string> | SocksProxyAgent | undefined {
    if (this.shouldBypassProxy(url) || !this.config.wsProxy) {
      return undefined;
    }

    try {
      if (this.config.wsProxy.startsWith('socks')) {
        return new SocksProxyAgent(this.config.wsProxy);
      } else {
        return new HttpsProxyAgent(this.config.wsProxy);
      }
    } catch (error) {
      proxyLogger.error('创建WebSocket代理Agent失败', error);
      return undefined;
    }
  }

  /**
   * 获取Solana Connection的fetchOptions
   */
  getSolanaFetchOptions(): any {
    if (!this.config.httpProxy && !this.config.httpsProxy) {
      return undefined;
    }

    return {
      agent: (parsedURL: URL) => {
        if (this.shouldBypassProxy(parsedURL.href)) {
          return undefined;
        }
        
        if (parsedURL.protocol === 'https:') {
          return this.httpsAgent;
        } else {
          return this.httpAgent;
        }
      },
    };
  }

  /**
   * 获取当前代理配置
   */
  getConfig(): ProxyConfig {
    return { ...this.config };
  }

  /**
   * 更新代理配置
   */
  updateConfig(config: Partial<ProxyConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeAgents();
    proxyLogger.info('代理配置已更新');
  }

  /**
   * 是否启用了代理
   */
  isProxyEnabled(): boolean {
    return !!(this.config.httpProxy || this.config.httpsProxy);
  }

  /**
   * 掩码代理URL（隐藏敏感信息）
   */
  private maskProxyUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.username || urlObj.password) {
        return `${urlObj.protocol}//*****:*****@${urlObj.host}`;
      }
      return url;
    } catch {
      return url;
    }
  }
}

/**
 * 获取代理管理器实例（便捷函数）
 */
export function getProxyManager(): ProxyManager {
  return ProxyManager.getInstance();
}

/**
 * 获取Axios代理配置（便捷函数）
 */
export function getAxiosProxyConfig(url: string = ''): any {
  return getProxyManager().getAxiosConfig(url);
}

/**
 * 获取WebSocket代理Agent（便捷函数）
 */
export function getWebSocketProxyAgent(url: string): any {
  return getProxyManager().getWebSocketAgent(url);
}

/**
 * 获取Solana Connection代理配置（便捷函数）
 */
export function getSolanaProxyConfig(): any {
  return getProxyManager().getSolanaFetchOptions();
}
