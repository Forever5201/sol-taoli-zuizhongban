"use strict";
/**
 * 交易构建器
 *
 * 负责构建、签名和序列化 Solana 交易
 * MVP版本：实现基础Swap交易和优先费设置
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionBuilder = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("../logger");
const txLogger = logger_1.logger.child({ module: 'TransactionBuilder' });
/**
 * 交易构建器类
 */
class TransactionBuilder {
    /**
     * 构建Swap交易
     * @param route Swap路由
     * @param payer 支付者密钥对
     * @param priorityFee 优先费（microLamports）
     * @returns Transaction对象
     */
    static async buildSwapTransaction(route, payer, priorityFee = 0) {
        try {
            const transaction = new web3_js_1.Transaction();
            // 1. 设置优先费（如果指定）
            if (priorityFee > 0) {
                this.setComputeUnitPrice(transaction, priorityFee);
            }
            // 2. 添加Swap指令
            if (route.instructions && route.instructions.length > 0) {
                for (const instruction of route.instructions) {
                    transaction.add(instruction);
                }
            }
            else {
                txLogger.warn('No swap instructions provided, transaction will be empty');
            }
            // 3. 设置 feePayer
            transaction.feePayer = payer.publicKey;
            txLogger.debug(`Swap transaction built for ${route.dex.join(' -> ')}`);
            return transaction;
        }
        catch (error) {
            txLogger.error(`Failed to build swap transaction: ${error}`);
            throw error;
        }
    }
    /**
     * 设置计算单元价格（优先费）
     * @param transaction 交易对象
     * @param microLamports 价格（microLamports）
     */
    static setComputeUnitPrice(transaction, microLamports) {
        const instruction = web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({
            microLamports,
        });
        transaction.add(instruction);
        txLogger.debug(`Compute unit price set to ${microLamports} microLamports`);
    }
    /**
     * 设置计算单元限制
     * @param transaction 交易对象
     * @param units 计算单元数量
     */
    static setComputeUnitLimit(transaction, units) {
        const instruction = web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({
            units,
        });
        transaction.add(instruction);
        txLogger.debug(`Compute unit limit set to ${units}`);
    }
    /**
     * 签名交易
     * @param transaction 交易对象
     * @param signers 签名者列表
     * @returns 签名后的交易
     */
    static signTransaction(transaction, signers) {
        try {
            transaction.sign(...signers);
            txLogger.debug(`Transaction signed by ${signers.length} signer(s)`);
            return transaction;
        }
        catch (error) {
            txLogger.error(`Failed to sign transaction: ${error}`);
            throw error;
        }
    }
    /**
     * 序列化交易
     * @param transaction 交易对象
     * @returns 序列化后的Buffer
     */
    static serializeTransaction(transaction) {
        try {
            const serialized = transaction.serialize();
            txLogger.debug(`Transaction serialized: ${serialized.length} bytes`);
            return serialized;
        }
        catch (error) {
            txLogger.error(`Failed to serialize transaction: ${error}`);
            throw error;
        }
    }
    /**
     * 签名并序列化交易
     * @param transaction 交易对象
     * @param signers 签名者列表
     * @returns 序列化后的Buffer
     */
    static signAndSerialize(transaction, signers) {
        this.signTransaction(transaction, signers);
        return this.serializeTransaction(transaction);
    }
    /**
     * 构建简单的SOL转账交易
     * @param from 发送者
     * @param to 接收者
     * @param lamports 金额（lamports）
     * @returns Transaction对象
     */
    static buildTransferTransaction(from, to, lamports) {
        const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey: from.publicKey,
            toPubkey: to,
            lamports,
        }));
        transaction.feePayer = from.publicKey;
        txLogger.debug(`Transfer transaction built: ${lamports} lamports`);
        return transaction;
    }
    /**
     * 创建测试交易（用于调试）
     * @param payer 支付者
     * @returns Transaction对象
     */
    static createTestTransaction(payer) {
        const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: payer.publicKey,
            lamports: 0,
        }));
        transaction.feePayer = payer.publicKey;
        txLogger.debug('Test transaction created');
        return transaction;
    }
    /**
     * 估算交易大小
     * @param transaction 交易对象
     * @returns 交易大小（bytes）
     */
    static estimateTransactionSize(transaction) {
        try {
            // 创建一个临时副本并序列化以估算大小
            const serialized = transaction.serializeMessage();
            return serialized.length;
        }
        catch (error) {
            txLogger.warn(`Failed to estimate transaction size: ${error}`);
            return 0;
        }
    }
    /**
     * 验证交易
     * @param transaction 交易对象
     * @returns 是否有效
     */
    static validateTransaction(transaction) {
        try {
            // 检查基本属性
            if (!transaction.feePayer) {
                txLogger.error('Transaction validation failed: no feePayer');
                return false;
            }
            if (transaction.instructions.length === 0) {
                txLogger.error('Transaction validation failed: no instructions');
                return false;
            }
            // 检查交易大小
            const size = this.estimateTransactionSize(transaction);
            if (size > 1232) {
                // Solana交易大小限制
                txLogger.error(`Transaction too large: ${size} bytes (max 1232)`);
                return false;
            }
            return true;
        }
        catch (error) {
            txLogger.error(`Transaction validation error: ${error}`);
            return false;
        }
    }
}
exports.TransactionBuilder = TransactionBuilder;
exports.default = TransactionBuilder;
//# sourceMappingURL=transaction.js.map