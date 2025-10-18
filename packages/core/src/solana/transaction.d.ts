/**
 * 交易构建器
 *
 * 负责构建、签名和序列化 Solana 交易
 * MVP版本：实现基础Swap交易和优先费设置
 */
import { Transaction, TransactionInstruction, Keypair, PublicKey } from '@solana/web3.js';
/**
 * Swap路由接口（简化版）
 */
export interface SwapRoute {
    /** 输入代币地址 */
    inputMint: PublicKey;
    /** 输出代币地址 */
    outputMint: PublicKey;
    /** 输入金额 */
    amount: number;
    /** DEX列表 */
    dex: string[];
    /** 交易指令（如果已生成） */
    instructions?: TransactionInstruction[];
}
/**
 * 交易构建器类
 */
export declare class TransactionBuilder {
    /**
     * 构建Swap交易
     * @param route Swap路由
     * @param payer 支付者密钥对
     * @param priorityFee 优先费（microLamports）
     * @returns Transaction对象
     */
    static buildSwapTransaction(route: SwapRoute, payer: Keypair, priorityFee?: number): Promise<Transaction>;
    /**
     * 设置计算单元价格（优先费）
     * @param transaction 交易对象
     * @param microLamports 价格（microLamports）
     */
    static setComputeUnitPrice(transaction: Transaction, microLamports: number): void;
    /**
     * 设置计算单元限制
     * @param transaction 交易对象
     * @param units 计算单元数量
     */
    static setComputeUnitLimit(transaction: Transaction, units: number): void;
    /**
     * 签名交易
     * @param transaction 交易对象
     * @param signers 签名者列表
     * @returns 签名后的交易
     */
    static signTransaction(transaction: Transaction, signers: Keypair[]): Transaction;
    /**
     * 序列化交易
     * @param transaction 交易对象
     * @returns 序列化后的Buffer
     */
    static serializeTransaction(transaction: Transaction): Buffer;
    /**
     * 签名并序列化交易
     * @param transaction 交易对象
     * @param signers 签名者列表
     * @returns 序列化后的Buffer
     */
    static signAndSerialize(transaction: Transaction, signers: Keypair[]): Buffer;
    /**
     * 构建简单的SOL转账交易
     * @param from 发送者
     * @param to 接收者
     * @param lamports 金额（lamports）
     * @returns Transaction对象
     */
    static buildTransferTransaction(from: Keypair, to: PublicKey, lamports: number): Transaction;
    /**
     * 创建测试交易（用于调试）
     * @param payer 支付者
     * @returns Transaction对象
     */
    static createTestTransaction(payer: Keypair): Transaction;
    /**
     * 估算交易大小
     * @param transaction 交易对象
     * @returns 交易大小（bytes）
     */
    static estimateTransactionSize(transaction: Transaction): number;
    /**
     * 验证交易
     * @param transaction 交易对象
     * @returns 是否有效
     */
    static validateTransaction(transaction: Transaction): boolean;
}
export default TransactionBuilder;
//# sourceMappingURL=transaction.d.ts.map