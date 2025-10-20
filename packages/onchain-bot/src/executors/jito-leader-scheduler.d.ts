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
export declare class JitoLeaderScheduler {
    private connection;
    private jitoClient;
    private leaderCache;
    private readonly maxAcceptableWaitSlots;
    private readonly enableCache;
    private readonly cacheDurationSlots;
    private stats;
    constructor(connection: Connection, jitoClient: ReturnType<typeof searcherClient>, config?: JitoLeaderSchedulerConfig);
    /**
     * 检查是否应该发送 Bundle
     * @returns Leader 信息和决策
     */
    shouldSendBundle(): Promise<JitoLeaderInfo>;
    /**
     * 获取完整的 Leader 调度表 (高级功能)
     * @returns Leader 调度 Map (slot -> validator pubkey)
     */
    getLeaderSchedule(): Promise<Map<number, PublicKey>>;
    /**
     * 预测下一个 Jito Leader 的等待时间
     * @returns 预计等待时间（毫秒），如果无法预测返回 Infinity
     */
    estimateWaitTime(): Promise<number>;
    /**
     * 更新缓存
     * @param slot 当前 slot
     * @param isJitoLeader 是否是 Jito Leader
     */
    private updateCache;
    /**
     * 记录检查时间（用于统计）
     */
    private recordCheckTime;
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
    };
    /**
     * 重置统计数据
     */
    resetStats(): void;
    /**
     * 清除缓存
     */
    clearCache(): void;
}
//# sourceMappingURL=jito-leader-scheduler.d.ts.map