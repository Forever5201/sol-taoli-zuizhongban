import axios, { AxiosInstance } from 'axios';
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('RustCacheClient');

/**
 * Pool price from Rust cache
 */
export interface RustPoolPrice {
  pool_id: string;
  dex_name: string;
  pair: string;
  price: number;
  base_reserve: number;
  quote_reserve: number;
  age_ms: number;
}

/**
 * Arbitrage opportunity from Rust cache
 */
export interface RustArbitrageOpportunity {
  pool_a_id: string;
  pool_a_dex: string;
  pool_a_price: number;
  pool_b_id: string;
  pool_b_dex: string;
  pool_b_price: number;
  pair: string;
  price_diff_pct: number;
  estimated_profit_pct: number;
  age_ms: number;
}

/**
 * Health response from Rust cache
 */
export interface RustHealthResponse {
  status: string;
  cached_pools: number;
  cached_pairs: string[];
}

/**
 * Client for Rust Pool Cache HTTP API
 * 
 * Provides ultra-low latency price queries for cached Raydium/Orca pools.
 * Falls back gracefully to Jupiter API if unavailable.
 */
export class RustPoolCacheClient {
  private axios: AxiosInstance;
  private enabled: boolean;
  private available: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 30000; // 30 seconds

  constructor(
    baseURL: string = 'http://localhost:3001',
    enabled: boolean = true
  ) {
    this.axios = axios.create({
      baseURL,
      timeout: 100, // 100ms timeout (Rust Cache is super fast!)
    });
    this.enabled = enabled;
  }

  /**
   * Check if Rust Pool Cache is available
   * Cached for 30 seconds to avoid excessive checks
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.available;
    }

    try {
      const response = await this.axios.get<RustHealthResponse>('/health');
      this.available = response.data.status === 'ok';
      this.lastHealthCheck = now;
      
      if (this.available) {
        logger.info(`🦀 Rust Cache: ${response.data.cached_pools} pools cached, pairs: ${response.data.cached_pairs.join(', ')}`);
      }
      
      return this.available;
    } catch (error) {
      this.available = false;
      this.lastHealthCheck = now;
      logger.debug('Rust Cache not available:', error);
      return false;
    }
  }

  /**
   * Get all cached prices
   */
  async getAllPrices(): Promise<RustPoolPrice[]> {
    if (!this.enabled || !await this.isAvailable()) {
      return [];
    }

    try {
      const response = await this.axios.get<RustPoolPrice[]>('/prices');
      return response.data;
    } catch (error) {
      logger.warn('Rust Cache: Failed to get all prices', error);
      return [];
    }
  }

  /**
   * Get prices for a specific pair
   */
  async getPairPrices(pair: string): Promise<RustPoolPrice[]> {
    if (!this.enabled || !await this.isAvailable()) {
      return [];
    }

    try {
      const encodedPair = encodeURIComponent(pair);
      const response = await this.axios.get<RustPoolPrice[]>(`/prices/${encodedPair}`);
      return response.data;
    } catch (error) {
      logger.debug(`Rust Cache: Failed to get prices for ${pair}`, error);
      return [];
    }
  }

  /**
   * Scan for arbitrage opportunities
   */
  async scanArbitrage(thresholdPct: number = 0.3): Promise<RustArbitrageOpportunity[]> {
    if (!this.enabled || !await this.isAvailable()) {
      return [];
    }

    try {
      const response = await this.axios.post<{
        opportunities: RustArbitrageOpportunity[];
        count: number;
      }>('/scan-arbitrage', {
        threshold_pct: thresholdPct,
      });
      
      return response.data.opportunities;
    } catch (error) {
      logger.warn('Rust Cache: Failed to scan arbitrage', error);
      return [];
    }
  }

  /**
   * Get statistics about Rust cache
   */
  async getStats(): Promise<{ cached_pools: number; cached_pairs: string[] } | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await this.axios.get<RustHealthResponse>('/health');
      return {
        cached_pools: response.data.cached_pools,
        cached_pairs: response.data.cached_pairs,
      };
    } catch {
      return null;
    }
  }

  /**
   * Enable or disable the client
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      logger.info('🦀 Rust Cache client enabled');
    } else {
      logger.info('🦀 Rust Cache client disabled');
    }
  }

  /**
   * Check if client is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

