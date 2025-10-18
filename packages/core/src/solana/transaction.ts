/**
 * 交易构建器
 * 
 * 负责构建、签名和序列化 Solana 交易
 * 集成Jupiter SDK提供真实的Swap指令
 */

import {
  Transaction,
  TransactionInstruction,
  Keypair,
  PublicKey,
  ComputeBudgetProgram,
  SystemProgram,
  Connection,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
} from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { logger } from '../logger';
import { JupiterSwapClient, SwapResult } from './jupiter-swap';
import { 
  FlashLoanTransactionBuilder,
  SolendAdapter,
  FlashLoanProtocol,
  AtomicArbitrageConfig,
} from '../flashloan';

const txLogger = logger.child({ module: 'TransactionBuilder' });

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
export class TransactionBuilder {
  private static jupiterClient?: JupiterSwapClient;

  /**
   * 初始化Jupiter客户端
   */
  static initializeJupiter(connection: Connection, apiUrl?: string): void {
    this.jupiterClient = new JupiterSwapClient(connection, { apiUrl });
    txLogger.info('Jupiter client initialized');
  }

  /**
   * 构建真实的Swap交易（使用Jupiter）
   * @param inputMint 输入代币
   * @param outputMint 输出代币
   * @param amount 输入金额
   * @param payer 支付者密钥对
   * @param slippageBps 滑点（basis points）
   * @param priorityFee 优先费（microLamports）
   * @returns SwapResult包含VersionedTransaction
   */
  static async buildRealSwapTransaction(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number,
    payer: Keypair,
    slippageBps: number = 50,
    priorityFee: number = 0
  ): Promise<SwapResult & { signedTransaction: VersionedTransaction }> {
    try {
      if (!this.jupiterClient) {
        throw new Error('Jupiter client not initialized. Call initializeJupiter() first.');
      }

      // 1. 获取Jupiter Swap交易
      const swapResult = await this.jupiterClient.getSwapTransaction(
        inputMint,
        outputMint,
        amount,
        payer.publicKey,
        slippageBps
      );

      // 2. 添加优先费（如果需要）
      if (priorityFee > 0) {
        // 注意：VersionedTransaction需要重新构建来添加优先费
        // 这里我们先返回原交易，优先费可以在Jupiter API调用时添加
        txLogger.warn('Priority fee for VersionedTransaction should be added via Jupiter API');
      }

      // 3. 签名交易
      swapResult.transaction.sign([payer]);

      txLogger.info(
        `Real swap transaction built: ${swapResult.dexes.join(' -> ')}, ` +
        `impact: ${swapResult.priceImpact.toFixed(3)}%`
      );

      return {
        ...swapResult,
        signedTransaction: swapResult.transaction,
      };
    } catch (error: any) {
      txLogger.error(`Failed to build real swap transaction: ${error.message}`);
      throw error;
    }
  }

  /**
   * 构建Swap交易（传统方式，兼容旧代码）
   * @param route Swap路由
   * @param payer 支付者密钥对
   * @param priorityFee 优先费（microLamports）
   * @returns Transaction对象
   * @deprecated 建议使用 buildRealSwapTransaction
   */
  static async buildSwapTransaction(
    route: SwapRoute,
    payer: Keypair,
    priorityFee: number = 0
  ): Promise<Transaction> {
    try {
      const transaction = new Transaction();

      // 1. 设置优先费（如果指定）
      if (priorityFee > 0) {
        this.setComputeUnitPrice(transaction, priorityFee);
      }

      // 2. 添加Swap指令
      if (route.instructions && route.instructions.length > 0) {
        for (const instruction of route.instructions) {
          transaction.add(instruction);
        }
      } else {
        txLogger.warn('No swap instructions provided, using test transaction');
        // 如果有Jupiter客户端，尝试获取真实交易
        if (this.jupiterClient) {
          txLogger.info('Attempting to get real swap via Jupiter...');
          // 这里需要调用buildRealSwapTransaction
        }
      }

      // 3. 设置 feePayer
      transaction.feePayer = payer.publicKey;

      txLogger.debug(`Swap transaction built for ${route.dex.join(' -> ')}`);
      return transaction;
    } catch (error) {
      txLogger.error(`Failed to build swap transaction: ${error}`);
      throw error;
    }
  }

  /**
   * 设置计算单元价格（优先费）
   * @param transaction 交易对象
   * @param microLamports 价格（microLamports）
   */
  static setComputeUnitPrice(transaction: Transaction, microLamports: number): void {
    const instruction = ComputeBudgetProgram.setComputeUnitPrice({
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
  static setComputeUnitLimit(transaction: Transaction, units: number): void {
    const instruction = ComputeBudgetProgram.setComputeUnitLimit({
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
  static signTransaction(transaction: Transaction, signers: Keypair[]): Transaction {
    try {
      transaction.sign(...signers);
      txLogger.debug(`Transaction signed by ${signers.length} signer(s)`);
      return transaction;
    } catch (error) {
      txLogger.error(`Failed to sign transaction: ${error}`);
      throw error;
    }
  }

  /**
   * 序列化交易
   * @param transaction 交易对象
   * @returns 序列化后的Buffer
   */
  static serializeTransaction(transaction: Transaction): Buffer {
    try {
      const serialized = transaction.serialize();
      txLogger.debug(`Transaction serialized: ${serialized.length} bytes`);
      return serialized;
    } catch (error) {
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
  static signAndSerialize(transaction: Transaction, signers: Keypair[]): Buffer {
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
  static buildTransferTransaction(
    from: Keypair,
    to: PublicKey,
    lamports: number
  ): Transaction {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports,
      })
    );

    transaction.feePayer = from.publicKey;
    
    txLogger.debug(`Transfer transaction built: ${lamports} lamports`);
    return transaction;
  }

  /**
   * 创建测试交易（用于调试）
   * @param payer 支付者
   * @returns Transaction对象
   */
  static createTestTransaction(payer: Keypair): Transaction {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: payer.publicKey,
        lamports: 0,
      })
    );

    transaction.feePayer = payer.publicKey;
    
    txLogger.debug('Test transaction created');
    return transaction;
  }

  /**
   * 估算交易大小
   * @param transaction 交易对象
   * @returns 交易大小（bytes）
   */
  static estimateTransactionSize(transaction: Transaction): number {
    try {
      // 创建一个临时副本并序列化以估算大小
      const serialized = transaction.serializeMessage();
      return serialized.length;
    } catch (error) {
      txLogger.warn(`Failed to estimate transaction size: ${error}`);
      return 0;
    }
  }

  /**
   * 验证交易
   * @param transaction 交易对象
   * @returns 是否有效
   */
  static validateTransaction(transaction: Transaction): boolean {
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
    } catch (error) {
      txLogger.error(`Transaction validation error: ${error}`);
      return false;
    }
  }

  // ========================================
  // 闪电贷功能
  // ========================================

  /**
   * 构建闪电贷套利交易
   * 
   * 使用Solend闪电贷进行原子套利
   * 
   * @param borrowAmount 借款金额（lamports）
   * @param tokenMint 代币mint地址
   * @param arbitrageInstructions 套利交易指令
   * @param wallet 钱包Keypair
   * @param connection Solana连接
   * @returns 签名后的VersionedTransaction
   */
  static async buildFlashLoanArbitrageTx(
    borrowAmount: number,
    tokenMint: PublicKey,
    arbitrageInstructions: TransactionInstruction[],
    wallet: Keypair,
    connection: Connection
  ): Promise<VersionedTransaction> {
    try {
      txLogger.info(`Building flash loan arbitrage tx: ${borrowAmount} lamports`);

      // 1. 获取用户代币账户
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );

      // 2. 获取最新区块哈希
      const { blockhash } = await connection.getLatestBlockhash();

      // 3. 构建闪电贷配置
      const config: AtomicArbitrageConfig = {
        useFlashLoan: true,
        flashLoanConfig: {
          protocol: FlashLoanProtocol.SOLEND,
          amount: borrowAmount,
          tokenMint,
        },
        arbitrageInstructions,
        wallet: wallet.publicKey,
      };

      // 4. 构建原子交易
      const tx = FlashLoanTransactionBuilder.buildAtomicArbitrageTx(
        config,
        blockhash,
        userTokenAccount
      );

      // 5. 签名
      tx.sign([wallet]);

      txLogger.info('✅ Flash loan arbitrage transaction built and signed');

      return tx;
    } catch (error: any) {
      txLogger.error(`Failed to build flash loan arbitrage tx: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证闪电贷套利可行性
   * 
   * @param borrowAmount 借款金额
   * @param expectedProfit 预期利润
   * @returns 验证结果
   */
  static validateFlashLoanArbitrage(
    borrowAmount: number,
    expectedProfit: number
  ): {
    valid: boolean;
    fee: number;
    netProfit: number;
    reason?: string;
  } {
    return SolendAdapter.validateFlashLoan(borrowAmount, expectedProfit);
  }

  /**
   * 计算最优闪电贷金额
   * 
   * @param availableCapital 可用资金
   * @param opportunitySize 机会所需资金
   * @param expectedProfitRate 预期利润率
   */
  static calculateOptimalFlashLoan(
    availableCapital: number,
    opportunitySize: number,
    expectedProfitRate: number
  ) {
    return FlashLoanTransactionBuilder.calculateOptimalBorrowAmount(
      availableCapital,
      opportunitySize,
      expectedProfitRate
    );
  }

  /**
   * 计算闪电贷费用
   * 
   * @param amount 借款金额
   * @returns 手续费
   */
  static calculateFlashLoanFee(amount: number): number {
    return SolendAdapter.calculateFee(amount);
  }
}

export default TransactionBuilder;


