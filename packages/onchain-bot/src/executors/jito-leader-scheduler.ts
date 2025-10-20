/**
 * Jito Leader Scheduler
 * 
 * 负责检查 Jito Leader 调度，决定何时发送 Bundle
 * 
 * 核心价值：
 * - Jito 验证者只占网络 ~25% 的 slot
 * - 在非 Jito Leader slot 发送 bundle = 100% 浪费 tip
 * - 通过 Leader 检查，成功率从 15% 提升到 60%（4倍提升）
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { createLogger } from '@solana-arb-bot/core';

const logger = createLogger('JitoLeaderScheduler');

/**
 * Jito Leader 信息
 */
export interface JitoLeaderInfo {
  /** 下一个 Jito Leader 的 slot */
  nextLeaderSlot: number;
  /** 当前 slot */
  currentSlot: number;
  /** 距离下一个 Jito Leader 的 slot 数 */
  slotsUntilJito: number;
  /** 是否应该发送 Bundle */
  shouldSend: boolean;
  /** 原因说明 */
  reason?: string;
}

/**
 * Jito Leader 调度器配置
 */
export interface JitoLeaderSchedulerConfig {
  /** 最大可接受的等待 slots（默认 5） */
  maxAcceptableWaitSlots?: number;
  /** 是否启用缓存（减少 RPC 调用） */
  enableCache?: boolean;
  /** 缓存持续时间（slots，默认 50） */
  cacheDurationSlots?: number;
}

/**
 * Jito Leader 调度器
 */
export class JitoLeaderScheduler {
  private connection: Connection;
  private jitoClient: ReturnType<typeof searcherClient>;
  private leaderCache: Map<number, boolean> = new Map();
  private readonly maxAcceptableWaitSlots: number;
  private readonly enableCache: boolean;
  private readonly cacheDurationSlots: number;
  
  // 统计数据
  private stats = {
    totalChecks: 0,
    jitoSlotsFound: 0,
    nonJitoSlotsSkipped: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgCheckTimeMs: 0,
    checkTimes: [] as number[],
  };

  constructor(
    connection: Connection,
    jitoClient: ReturnType<typeof searcherClient>,
    config: JitoLeaderSchedulerConfig = {}
  ) {
    this.connection = connection;
    this.jitoClient = jitoClient;
    this.maxAcceptableWaitSlots = config.maxAcceptableWaitSlots ?? 5;
    this.enableCache = config.enableCache !== false;
    this.cacheDurationSlots = config.cacheDurationSlots ?? 50;

    logger.info('JitoLeaderScheduler initialized', {
      maxAcceptableWaitSlots: this.maxAcceptableWaitSlots,
      enableCache: this.enableCache,
      cacheDurationSlots: this.cacheDurationSlots,
    });
  }

  /**
   * 检查是否应该发送 Bundle
   * @returns Leader 信息和决策
   */
  async shouldSendBundle(): Promise<JitoLeaderInfo> {
    const startTime = Date.now();
    this.stats.totalChecks++;

    try {
      // 1. 获取当前 slot
      const currentSlot = await this.connection.getSlot('processed');

      // 2. 检查缓存
      if (this.enableCache && this.leaderCache.has(currentSlot)) {
        this.stats.cacheHits++;
        const isJitoLeader = this.leaderCache.get(currentSlot)!;
        
        if (isJitoLeader) {
          logger.debug(`✅ Cache hit: Current slot ${currentSlot} is Jito Leader`);
          return {
            nextLeaderSlot: currentSlot,
            currentSlot,
            slotsUntilJito: 0,
            shouldSend: true,
            reason: 'Current slot is Jito Leader (cached)',
          };
        }
      }

      this.stats.cacheMisses++;

      // 3. 查询下一个 Jito Leader
      const nextLeader = await this.jitoClient.getNextScheduledLeader();

      if (!nextLeader || typeof nextLeader.nextLeaderSlot !== 'number') {
        logger.warn('⚠️ Unable to get Jito Leader info');
        return {
          nextLeaderSlot: 0,
          currentSlot,
          slotsUntilJito: Infinity,
          shouldSend: false,
          reason: 'Unable to get Jito Leader info',
        };
      }

      // 4. 计算距离
      const slotsUntilJito = nextLeader.nextLeaderSlot - currentSlot;

      // 5. 更新缓存
      if (this.enableCache) {
        this.updateCache(currentSlot, slotsUntilJito === 0);
      }

      // 6. 决策逻辑
      let shouldSend = false;
      let reason = '';

      if (slotsUntilJito < 0) {
        // Jito Leader 已过去
        shouldSend = false;
        reason = `Jito Leader slot ${nextLeader.nextLeaderSlot} has passed (${Math.abs(slotsUntilJito)} slots ago)`;
        this.stats.nonJitoSlotsSkipped++;
      } else if (slotsUntilJito === 0) {
        // 当前就是 Jito Leader
        shouldSend = true;
        reason = `Current slot ${currentSlot} is Jito Leader`;
        this.stats.jitoSlotsFound++;
        logger.info(`✅ Jito Leader NOW at slot ${currentSlot}`);
      } else if (slotsUntilJito <= this.maxAcceptableWaitSlots) {
        // 在可接受范围内
        shouldSend = true;
        reason = `Jito Leader in ${slotsUntilJito} slots (slot ${nextLeader.nextLeaderSlot})`;
        this.stats.jitoSlotsFound++;
        logger.info(`✅ Jito Leader in ${slotsUntilJito} slots (slot ${nextLeader.nextLeaderSlot})`);
      } else {
        // 太远，放弃
        shouldSend = false;
        reason = `Jito Leader too far (${slotsUntilJito} slots, max ${this.maxAcceptableWaitSlots})`;
        this.stats.nonJitoSlotsSkipped++;
        logger.debug(`⏱️ Jito Leader too far: ${slotsUntilJito} slots`);
      }

      // 7. 记录检查时间
      const checkTime = Date.now() - startTime;
      this.recordCheckTime(checkTime);

      return {
        nextLeaderSlot: nextLeader.nextLeaderSlot,
        currentSlot,
        slotsUntilJito,
        shouldSend,
        reason,
      };

    } catch (error) {
      logger.error(`Failed to check Jito Leader: ${error}`);
      
      // 在错误情况下，保守处理：不发送
      const currentSlot = await this.connection.getSlot('processed').catch(() => 0);
      
      return {
        nextLeaderSlot: 0,
        currentSlot,
        slotsUntilJito: Infinity,
        shouldSend: false,
        reason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 获取完整的 Leader 调度表 (高级功能)
   * @returns Leader 调度 Map (slot -> validator pubkey)
   */
  async getLeaderSchedule(): Promise<Map<number, PublicKey>> {
    try {
      const epoch = await this.connection.getEpochInfo();
      const schedule = await this.connection.getLeaderSchedule();

      if (!schedule) {
        throw new Error('Failed to fetch leader schedule');
      }

      const leaderMap = new Map<number, PublicKey>();

      for (const [validatorKey, slots] of Object.entries(schedule)) {
        const pubkey = new PublicKey(validatorKey);
        for (const slot of slots) {
          const absoluteSlot = epoch.absoluteSlot + slot;
          leaderMap.set(absoluteSlot, pubkey);
        }
      }

      logger.info(`Leader schedule fetched: ${leaderMap.size} slots`);
      return leaderMap;

    } catch (error) {
      logger.error(`Failed to get leader schedule: ${error}`);
      throw error;
    }
  }

  /**
   * 预测下一个 Jito Leader 的等待时间
   * @returns 预计等待时间（毫秒），如果无法预测返回 Infinity
   */
  async estimateWaitTime(): Promise<number> {
    const info = await this.shouldSendBundle();
    
    if (!info.shouldSend || info.slotsUntilJito === Infinity) {
      return Infinity;
    }

    // Solana 平均出块时间：400ms
    const AVERAGE_SLOT_TIME_MS = 400;
    return info.slotsUntilJito * AVERAGE_SLOT_TIME_MS;
  }

  /**
   * 更新缓存
   * @param slot 当前 slot
   * @param isJitoLeader 是否是 Jito Leader
   */
  private updateCache(slot: number, isJitoLeader: boolean): void {
    // 添加到缓存
    this.leaderCache.set(slot, isJitoLeader);

    // 清理过期缓存（保留最近 cacheDurationSlots 个 slot）
    if (this.leaderCache.size > this.cacheDurationSlots) {
      const minSlot = slot - this.cacheDurationSlots;
      for (const cachedSlot of this.leaderCache.keys()) {
        if (cachedSlot < minSlot) {
          this.leaderCache.delete(cachedSlot);
        }
      }
    }
  }

  /**
   * 记录检查时间（用于统计）
   */
  private recordCheckTime(timeMs: number): void {
    this.stats.checkTimes.push(timeMs);
    
    // 保留最近 100 次
    if (this.stats.checkTimes.length > 100) {
      this.stats.checkTimes.shift();
    }

    // 更新平均值
    this.stats.avgCheckTimeMs = 
      this.stats.checkTimes.reduce((a, b) => a + b, 0) / this.stats.checkTimes.length;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalChecks: number;
    jitoSlotsFound: number;
    nonJitoSlotsSkipped: number;
    jitoSlotRatio: number;
    cacheHitRate: number;
    avgCheckTimeMs: number;
  } {
    const jitoSlotRatio = this.stats.totalChecks > 0
      ? (this.stats.jitoSlotsFound / this.stats.totalChecks) * 100
      : 0;

    const totalCacheRequests = this.stats.cacheHits + this.stats.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0
      ? (this.stats.cacheHits / totalCacheRequests) * 100
      : 0;

    return {
      totalChecks: this.stats.totalChecks,
      jitoSlotsFound: this.stats.jitoSlotsFound,
      nonJitoSlotsSkipped: this.stats.nonJitoSlotsSkipped,
      jitoSlotRatio,
      cacheHitRate,
      avgCheckTimeMs: this.stats.avgCheckTimeMs,
    };
  }

  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.stats = {
      totalChecks: 0,
      jitoSlotsFound: 0,
      nonJitoSlotsSkipped: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgCheckTimeMs: 0,
      checkTimes: [],
    };
    logger.info('Statistics reset');
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.leaderCache.clear();
    logger.info('Cache cleared');
  }
}

