"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JitoExecutor = void 0;
const web3_js_1 = require("@solana/web3.js");
const searcher_1 = require("jito-ts/dist/sdk/block-engine/searcher");
const types_1 = require("jito-ts/dist/sdk/block-engine/types");
const core_1 = require("@solana-arb-bot/core");
const logger = (0, core_1.createLogger)('JitoExecutor');
/**
 * Jito Tip账户列表
 * 来源：https://jito-labs.gitbook.io/mev/searcher-resources/tips
 */
const JITO_TIP_ACCOUNTS = [
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];
/**
 * Jito执行器类
 */
class JitoExecutor {
    connection;
    wallet;
    config;
    jitoTipOptimizer;
    client;
    // 统计数据
    stats = {
        totalBundles: 0,
        successfulBundles: 0,
        failedBundles: 0,
        totalTipSpent: 0,
        totalProfit: 0,
    };
    constructor(connection, wallet, jitoTipOptimizer, config) {
        this.connection = connection;
        this.wallet = wallet;
        this.jitoTipOptimizer = jitoTipOptimizer;
        this.config = {
            blockEngineUrl: config.blockEngineUrl,
            authKeypair: config.authKeypair || wallet,
            maxRetries: config.maxRetries || 3,
            confirmationTimeout: config.confirmationTimeout || 30000,
            checkJitoLeader: config.checkJitoLeader !== false,
            minTipLamports: config.minTipLamports || 1_000, // 0.000001 SOL
            maxTipLamports: config.maxTipLamports || 100_000_000, // 0.1 SOL
        };
        // 初始化Jito客户端
        this.client = (0, searcher_1.searcherClient)(this.config.blockEngineUrl, this.config.authKeypair);
        logger.info(`Jito executor initialized | Block Engine: ${config.blockEngineUrl} | ` +
            `Min Tip: ${this.config.minTipLamports} lamports | ` +
            `Max Tip: ${this.config.maxTipLamports} lamports`);
    }
    /**
     * 执行套利交易
     * @param arbitrageTx 套利交易
     * @param expectedProfit 预期利润（lamports）
     * @param competitionLevel 竞争强度（0-1）
     * @param urgency 紧迫性（0-1）
     * @returns 执行结果
     */
    async execute(arbitrageTx, expectedProfit, competitionLevel = 0.5, urgency = 0.7) {
        const startTime = Date.now();
        this.stats.totalBundles++;
        try {
            // 1. 检查Jito领导者（可选）
            if (this.config.checkJitoLeader) {
                const isJitoSlot = await this.checkNextLeaderIsJito();
                if (!isJitoSlot) {
                    logger.warn('Next leader is not Jito validator, bundle may not land');
                }
            }
            // 2. 计算最优小费
            const optimalTip = await this.calculateOptimalTip(expectedProfit, competitionLevel, urgency);
            if (optimalTip < this.config.minTipLamports) {
                throw new Error(`Calculated tip ${optimalTip} is below minimum ${this.config.minTipLamports}`);
            }
            if (optimalTip > this.config.maxTipLamports) {
                logger.warn(`Calculated tip ${optimalTip} exceeds maximum ${this.config.maxTipLamports}, capping`);
            }
            const tipToUse = Math.min(optimalTip, this.config.maxTipLamports);
            logger.info(`Executing bundle | Expected Profit: ${expectedProfit} lamports | ` +
                `Tip: ${tipToUse} lamports | Competition: ${(competitionLevel * 100).toFixed(1)}%`);
            // 3. 构建Bundle
            const bundle = await this.buildBundle(arbitrageTx, tipToUse);
            // 4. 发送Bundle
            const bundleId = await this.sendBundle(bundle);
            logger.info(`Bundle sent successfully | ID: ${bundleId}`);
            // 5. 等待Bundle确认
            const bundleStatus = await this.waitForBundleConfirmation(bundleId);
            const latency = Date.now() - startTime;
            if (bundleStatus.success) {
                this.stats.successfulBundles++;
                this.stats.totalTipSpent += tipToUse;
                this.stats.totalProfit += (expectedProfit - tipToUse);
                // 记录成功结果到JitoTipOptimizer
                this.jitoTipOptimizer.recordBundleResult({
                    bundleId,
                    tip: tipToUse,
                    success: true,
                    profit: expectedProfit,
                    tokenPair: 'SOL-USDC', // TODO: 使用实际tokenPair
                    timestamp: Date.now(),
                });
                logger.info(`✅ Bundle landed successfully! | ` +
                    `Signature: ${bundleStatus.signature} | ` +
                    `Net Profit: ${expectedProfit - tipToUse} lamports | ` +
                    `Latency: ${latency}ms`);
                return {
                    success: true,
                    bundleId,
                    signature: bundleStatus.signature,
                    tipUsed: tipToUse,
                    latency,
                    bundleStatus: bundleStatus.status,
                };
            }
            else {
                this.stats.failedBundles++;
                // 记录失败结果
                this.jitoTipOptimizer.recordBundleResult({
                    bundleId,
                    tip: tipToUse,
                    success: false,
                    profit: 0,
                    tokenPair: 'SOL-USDC', // TODO: 使用实际tokenPair
                    timestamp: Date.now(),
                });
                logger.warn(`❌ Bundle failed to land | ` +
                    `ID: ${bundleId} | Status: ${bundleStatus.status} | ` +
                    `Latency: ${latency}ms`);
                return {
                    success: false,
                    bundleId,
                    tipUsed: tipToUse,
                    latency,
                    error: bundleStatus.error,
                    bundleStatus: bundleStatus.status,
                };
            }
        }
        catch (error) {
            const latency = Date.now() - startTime;
            this.stats.failedBundles++;
            logger.error(`Bundle execution failed: ${error}`);
            return {
                success: false,
                tipUsed: 0,
                latency,
                error: String(error),
            };
        }
    }
    /**
     * 执行VersionedTransaction（用于Jupiter Swap）
     */
    async executeVersionedTransaction(versionedTx, expectedProfit, competitionLevel = 0.5, urgency = 0.7) {
        const result = await this.execute(versionedTx, expectedProfit, competitionLevel, urgency);
        return {
            success: result.success,
            signature: result.signature,
            profit: result.success ? expectedProfit - result.tipUsed : 0,
            cost: result.tipUsed,
            timestamp: Date.now(),
            error: result.error,
        };
    }
    /**
     * 执行交易并转换为TransactionResult格式
     */
    async executeAndConvert(arbitrageTx, expectedProfit, competitionLevel = 0.5, urgency = 0.7) {
        const result = await this.execute(arbitrageTx, expectedProfit, competitionLevel, urgency);
        return {
            success: result.success,
            profit: result.success ? expectedProfit - result.tipUsed : undefined,
            cost: result.tipUsed,
            signature: result.signature,
            timestamp: Date.now(),
            error: result.error,
        };
    }
    /**
     * 构建Jito Bundle
     * @param arbitrageTx 套利交易
     * @param tipLamports 小费金额
     * @returns Bundle对象
     */
    async buildBundle(arbitrageTx, tipLamports) {
        // 1. 转换并签名套利交易
        let versionedArbitrageTx;
        if (arbitrageTx instanceof web3_js_1.Transaction) {
            // 将Transaction转换为VersionedTransaction
            const { blockhash } = await this.connection.getLatestBlockhash();
            const messageV0 = new web3_js_1.TransactionMessage({
                payerKey: this.wallet.publicKey,
                recentBlockhash: blockhash,
                instructions: arbitrageTx.instructions,
            }).compileToV0Message();
            versionedArbitrageTx = new web3_js_1.VersionedTransaction(messageV0);
            versionedArbitrageTx.sign([this.wallet]);
        }
        else {
            versionedArbitrageTx = arbitrageTx;
            // 确保已签名
            if (!versionedArbitrageTx.signatures || versionedArbitrageTx.signatures.length === 0) {
                versionedArbitrageTx.sign([this.wallet]);
            }
        }
        // 2. 创建小费交易
        const tipTx = await this.createTipTransaction(tipLamports);
        // 3. 构建Bundle
        const bundle = new types_1.Bundle([versionedArbitrageTx, tipTx], 5 // 最多尝试5个slot
        );
        return bundle;
    }
    /**
     * 创建小费交易
     * @param tipLamports 小费金额
     * @returns 小费交易
     */
    async createTipTransaction(tipLamports) {
        const tipAccount = this.selectTipAccount();
        const tipInstruction = web3_js_1.SystemProgram.transfer({
            fromPubkey: this.wallet.publicKey,
            toPubkey: new web3_js_1.PublicKey(tipAccount),
            lamports: tipLamports,
        });
        const { blockhash } = await this.connection.getLatestBlockhash();
        // 创建TransactionMessage并转换为VersionedTransaction
        const messageV0 = new web3_js_1.TransactionMessage({
            payerKey: this.wallet.publicKey,
            recentBlockhash: blockhash,
            instructions: [tipInstruction],
        }).compileToV0Message();
        const versionedTx = new web3_js_1.VersionedTransaction(messageV0);
        versionedTx.sign([this.wallet]);
        return versionedTx;
    }
    /**
     * 随机选择一个Jito Tip账户
     * @returns Tip账户地址
     */
    selectTipAccount() {
        const randomIndex = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
        return JITO_TIP_ACCOUNTS[randomIndex];
    }
    /**
     * 发送Bundle
     * @param bundle Bundle对象
     * @returns Bundle ID
     */
    async sendBundle(bundle) {
        try {
            const bundleId = await this.client.sendBundle(bundle);
            return bundleId;
        }
        catch (error) {
            logger.error(`Failed to send bundle: ${error}`);
            throw error;
        }
    }
    /**
     * 等待Bundle确认
     * @param bundleId Bundle ID
     * @returns Bundle状态
     */
    async waitForBundleConfirmation(bundleId) {
        const startTime = Date.now();
        const timeout = this.config.confirmationTimeout;
        while (Date.now() - startTime < timeout) {
            try {
                // jito-ts@3.0.1 API可能不同，使用类型any暂时绕过
                const statuses = await this.client.getBundleStatuses?.([bundleId]);
                if (statuses && statuses.value && statuses.value.length > 0) {
                    const bundleStatus = statuses.value[0];
                    if (bundleStatus.confirmation_status === 'confirmed') {
                        return {
                            success: true,
                            signature: bundleStatus.transactions?.[0],
                            status: 'confirmed',
                        };
                    }
                    if (bundleStatus.err) {
                        return {
                            success: false,
                            status: 'failed',
                            error: JSON.stringify(bundleStatus.err),
                        };
                    }
                }
                // 等待500ms后重试
                await this.sleep(500);
            }
            catch (error) {
                logger.debug(`Error checking bundle status: ${error}`);
            }
        }
        return {
            success: false,
            status: 'timeout',
            error: 'Bundle confirmation timeout',
        };
    }
    /**
     * 计算最优小费
     * @param expectedProfit 预期利润
     * @param competitionLevel 竞争强度（0-1）
     * @param urgency 紧迫性（0-1）
     * @returns 最优小费金额
     */
    async calculateOptimalTip(expectedProfit, competitionLevel, urgency) {
        // 使用已完成的JitoTipOptimizer
        const optimalTip = await this.jitoTipOptimizer.calculateOptimalTip(expectedProfit, competitionLevel, urgency, 'medium' // 资金量级，可以从配置读取
        );
        return optimalTip;
    }
    /**
     * 评估竞争强度
     * @param poolVolume 池子24h成交量（USD）
     * @param grossProfit 毛利润
     * @returns 竞争强度（0-1）
     */
    assessCompetition(poolVolume, grossProfit) {
        // 基于池子流行度
        const volumeFactor = Math.min(poolVolume / 10_000_000, 1); // 1000万USD为上限
        // 基于利润大小（利润越大，竞争越激烈）
        const profitFactor = Math.min(grossProfit / 1_000_000, 1); // 0.001 SOL为上限
        // 综合评估
        const competition = (volumeFactor * 0.6 + profitFactor * 0.4);
        return Math.max(0, Math.min(1, competition));
    }
    /**
     * 检查下一个出块者是否是Jito验证者
     * @returns 是否是Jito验证者
     */
    async checkNextLeaderIsJito() {
        try {
            const nextLeader = await this.client.getNextScheduledLeader();
            if (nextLeader) {
                logger.debug(`Next leader slot: ${nextLeader.nextLeaderSlot}`);
                return true;
            }
            return false;
        }
        catch (error) {
            logger.debug(`Failed to check next Jito leader: ${error}`);
            return false; // 默认继续执行
        }
    }
    /**
     * 获取执行统计
     */
    getStats() {
        const successRate = this.stats.totalBundles > 0
            ? (this.stats.successfulBundles / this.stats.totalBundles) * 100
            : 0;
        const averageTipPerBundle = this.stats.successfulBundles > 0
            ? this.stats.totalTipSpent / this.stats.successfulBundles
            : 0;
        return {
            ...this.stats,
            successRate,
            netProfit: this.stats.totalProfit - this.stats.totalTipSpent,
            averageTipPerBundle,
        };
    }
    /**
     * 重置统计数据
     */
    resetStats() {
        this.stats = {
            totalBundles: 0,
            successfulBundles: 0,
            failedBundles: 0,
            totalTipSpent: 0,
            totalProfit: 0,
        };
        logger.info('Statistics reset');
    }
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        logger.info('Jito executor config updated');
    }
    /**
     * Sleep辅助函数
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.JitoExecutor = JitoExecutor;
exports.default = JitoExecutor;
//# sourceMappingURL=jito-executor.js.map