/**
 * Jito执行器
 *
 * 通过Jito MEV优先通道执行交易，提供更高的成功率
 * 设计文档：第3.3节 - 路径A: Jito优先通道
 *
 * 核心优势：
 * - 优先打包（80-95%成功率 vs 50-60% RPC Spam）
 * - 失败不收费
 * - 动态小费优化（集成JitoTipOptimizer）
 * - 验证者直接通道
 */
import { Connection, Keypair, Transaction, VersionedTransaction, TransactionSignature } from '@solana/web3.js';
import { JitoTipOptimizer } from '@solana-arb-bot/core';
import type { TransactionResult } from '@solana-arb-bot/core';
/**
 * Jito配置
 */
export interface JitoExecutorConfig {
    /** Block Engine URL */
    blockEngineUrl: string;
    /** 认证密钥对（可选） */
    authKeypair?: Keypair;
    /** 最大重试次数 */
    maxRetries?: number;
    /** Bundle确认超时（ms） */
    confirmationTimeout?: number;
    /** 是否启用Jito领导者检查 */
    checkJitoLeader?: boolean;
    /** 最小小费（lamports） */
    minTipLamports?: number;
    /** 最大小费（lamports） */
    maxTipLamports?: number;
    /** 资金量级 */
    capitalSize?: 'small' | 'medium' | 'large';
    /** 利润分成比例（0-1） */
    profitSharePercentage?: number;
    /** 竞争强度倍数 */
    competitionMultiplier?: number;
    /** 紧迫性倍数 */
    urgencyMultiplier?: number;
    /** 是否使用历史学习 */
    useHistoricalLearning?: boolean;
    /** 历史数据权重（0-1） */
    historicalWeight?: number;
}
/**
 * Bundle执行结果
 */
export interface BundleExecutionResult {
    /** 是否成功 */
    success: boolean;
    /** Bundle ID */
    bundleId?: string;
    /** 交易签名 */
    signature?: TransactionSignature;
    /** 使用的小费（lamports） */
    tipUsed: number;
    /** 总延迟（ms） */
    latency: number;
    /** 错误信息 */
    error?: string;
    /** Bundle状态 */
    bundleStatus?: string;
}
/**
 * Jito执行器类
 */
export declare class JitoExecutor {
    private connection;
    private wallet;
    private config;
    private jitoTipOptimizer;
    private client;
    private leaderScheduler?;
    private stats;
    constructor(connection: Connection, wallet: Keypair, jitoTipOptimizer: JitoTipOptimizer, config: JitoExecutorConfig);
    /**
     * 执行套利交易
     * @param arbitrageTx 套利交易
     * @param expectedProfit 预期利润（lamports）
     * @param competitionLevel 竞争强度（0-1）
     * @param urgency 紧迫性（0-1）
     * @returns 执行结果
     */
    execute(arbitrageTx: Transaction | VersionedTransaction, expectedProfit: number, competitionLevel?: number, urgency?: number): Promise<BundleExecutionResult>;
    /**
     * 执行VersionedTransaction（用于Jupiter Swap）
     */
    executeVersionedTransaction(versionedTx: VersionedTransaction, expectedProfit: number, competitionLevel?: number, urgency?: number): Promise<TransactionResult>;
    /**
     * 执行交易并转换为TransactionResult格式
     */
    executeAndConvert(arbitrageTx: Transaction | VersionedTransaction, expectedProfit: number, competitionLevel?: number, urgency?: number): Promise<TransactionResult>;
    /**
     * 构建Jito Bundle
     * @param arbitrageTx 套利交易
     * @param tipLamports 小费金额
     * @returns Bundle对象
     */
    private buildBundle;
    /**
     * 创建小费交易
     * @param tipLamports 小费金额
     * @returns 小费交易
     */
    private createTipTransaction;
    /**
     * 随机选择一个Jito Tip账户
     * @returns Tip账户地址
     */
    private selectTipAccount;
    /**
     * 发送Bundle
     * @param bundle Bundle对象
     * @returns Bundle ID
     */
    private sendBundle;
    /**
     * 等待Bundle确认
     * @param bundleId Bundle ID
     * @returns Bundle状态
     */
    private waitForBundleConfirmation;
    /**
     * 计算最优小费（增强版 - 添加日志和 tokenPair 支持）
     * @param expectedProfit 预期利润
     * @param competitionLevel 竞争强度（0-1）
     * @param urgency 紧迫性（0-1）
     * @param tokenPair 交易对（用于历史学习）
     * @returns 最优小费金额
     */
    private calculateOptimalTip;
    /**
     * 评估竞争强度
     * @param poolVolume 池子24h成交量（USD）
     * @param grossProfit 毛利润
     * @returns 竞争强度（0-1）
     */
    assessCompetition(poolVolume: number, grossProfit: number): number;
    /**
     * 检查下一个出块者是否是Jito验证者
     * @returns 是否是Jito验证者
     */
    private checkNextLeaderIsJito;
    /**
     * 获取执行统计
     */
    getStats(): {
        totalBundles: number;
        successfulBundles: number;
        failedBundles: number;
        successRate: number;
        totalTipSpent: number;
        totalProfit: number;
        netProfit: number;
        averageTipPerBundle: number;
        leaderCheckSkips: number;
        leaderSchedulerStats?: any;
    };
    /**
     * 获取详细的 Tip 统计（新增）
     */
    getTipStatistics(): {
        overallStats: {
            totalBundles: number;
            successRate: number;
            avgTipPerBundle: number;
            totalTipSpent: number;
            tipEfficiency: number;
        };
        jitoOptimizerStats: any;
    };
    /**
     * 周期性打印统计报告（新增）
     */
    printStatisticsReport(): void;
    /**
     * 重置统计数据
     */
    resetStats(): void;
    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<JitoExecutorConfig>): void;
    /**
     * Sleep辅助函数
     */
    private sleep;
}
export default JitoExecutor;
//# sourceMappingURL=jito-executor.d.ts.map