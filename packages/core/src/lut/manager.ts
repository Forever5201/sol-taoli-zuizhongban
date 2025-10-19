/**
 * 地址查找表(LUT)管理器
 * 
 * Address Lookup Tables (LUTs) 允许交易引用最多256个账户
 * 每个账户仅占用1字节，而不是32字节
 * 
 * 关键优势:
 * - 压缩交易大小 96%
 * - 支持复杂的多跳套利
 * - 降低交易费用
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  AddressLookupTableProgram,
  AddressLookupTableAccount,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { logger } from '../logger';

const lutLogger = logger.child({ module: 'LUTManager' });

/**
 * LUT配置
 */
export interface LUTConfig {
  /** LUT地址 */
  address: PublicKey;
  /** 包含的账户地址 */
  addresses: PublicKey[];
  /** 创建时的slot */
  createdSlot?: number;
  /** 最后更新的slot */
  lastExtendedSlot?: number;
}

/**
 * LUT创建结果
 */
export interface CreateLUTResult {
  /** LUT地址 */
  lutAddress: PublicKey;
  /** 创建指令 */
  instruction: TransactionInstruction;
  /** 交易签名 */
  signature?: string;
}

/**
 * LUT扩展结果
 */
export interface ExtendLUTResult {
  /** 添加的地址数量 */
  addressesAdded: number;
  /** 扩展指令 */
  instructions: TransactionInstruction[];
  /** 交易签名 */
  signatures?: string[];
}

/**
 * 地址查找表管理器
 */
export class LUTManager {
  constructor(private connection: Connection) {}

  /**
   * 创建新的LUT
   * 
   * @param payer 支付者密钥对
   * @param authority LUT管理权限（默认为payer）
   * @returns 创建结果
   */
  async createLUT(
    payer: Keypair,
    authority?: PublicKey
  ): Promise<CreateLUTResult> {
    try {
      const slot = await this.connection.getSlot();
      const auth = authority || payer.publicKey;

      lutLogger.info(`Creating LUT at slot ${slot}`);

      // 1. 创建LUT指令
      const [createInstruction, lutAddress] =
        AddressLookupTableProgram.createLookupTable({
          authority: auth,
          payer: payer.publicKey,
          recentSlot: slot,
        });

      lutLogger.info(`LUT address will be: ${lutAddress.toBase58()}`);

      // 2. 构建交易
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      const messageV0 = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: blockhash,
        instructions: [createInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([payer]);

      // 3. 发送交易
      const signature = await this.connection.sendTransaction(transaction);

      lutLogger.info(`LUT creation tx sent: ${signature}`);

      // 4. 等待确认
      await this.connection.confirmTransaction(signature);

      lutLogger.info(`✅ LUT created successfully at ${lutAddress.toBase58()}`);

      return {
        lutAddress,
        instruction: createInstruction,
        signature,
      };
    } catch (error: any) {
      lutLogger.error(`Failed to create LUT: ${error.message}`);
      throw error;
    }
  }

  /**
   * 扩展LUT（添加地址）
   * 
   * @param lutAddress LUT地址
   * @param addresses 要添加的地址列表
   * @param payer 支付者
   * @param authority LUT权限（默认为payer）
   * @returns 扩展结果
   */
  async extendLUT(
    lutAddress: PublicKey,
    addresses: PublicKey[],
    payer: Keypair,
    authority?: Keypair
  ): Promise<ExtendLUTResult> {
    try {
      if (addresses.length === 0) {
        throw new Error('No addresses to add');
      }

      const auth = authority || payer;

      lutLogger.info(`Extending LUT ${lutAddress.toBase58()} with ${addresses.length} addresses`);

      // LUT扩展指令每次最多添加30个地址
      const BATCH_SIZE = 30;
      const instructions: TransactionInstruction[] = [];
      const signatures: string[] = [];

      // 分批添加
      for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
        const batch = addresses.slice(i, i + BATCH_SIZE);

        const extendInstruction = AddressLookupTableProgram.extendLookupTable({
          lookupTable: lutAddress,
          authority: auth.publicKey,
          payer: payer.publicKey,
          addresses: batch,
        });

        instructions.push(extendInstruction);

        // 构建并发送交易
        const { blockhash } = await this.connection.getLatestBlockhash();

        const messageV0 = new TransactionMessage({
          payerKey: payer.publicKey,
          recentBlockhash: blockhash,
          instructions: [extendInstruction],
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        transaction.sign([payer, auth]);

        const signature = await this.connection.sendTransaction(transaction);
        signatures.push(signature);

        lutLogger.info(`Batch ${Math.floor(i / BATCH_SIZE) + 1} sent: ${signature}`);

        // 等待确认
        await this.connection.confirmTransaction(signature);

        lutLogger.info(`Batch ${Math.floor(i / BATCH_SIZE) + 1} confirmed`);
      }

      lutLogger.info(`✅ LUT extended with ${addresses.length} addresses`);

      return {
        addressesAdded: addresses.length,
        instructions,
        signatures,
      };
    } catch (error: any) {
      lutLogger.error(`Failed to extend LUT: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取LUT账户信息
   * 
   * @param lutAddress LUT地址
   * @returns LUT账户数据
   */
  async getLUT(lutAddress: PublicKey): Promise<AddressLookupTableAccount | null> {
    try {
      const accountInfo = await this.connection.getAddressLookupTable(lutAddress);
      
      if (!accountInfo.value) {
        lutLogger.warn(`LUT not found: ${lutAddress.toBase58()}`);
        return null;
      }

      const lut = accountInfo.value;

      lutLogger.info(
        `LUT ${lutAddress.toBase58()}: ` +
        `${lut.state.addresses.length} addresses, ` +
        `authority: ${lut.state.authority?.toBase58() || 'none'}`
      );

      return lut;
    } catch (error: any) {
      lutLogger.error(`Failed to get LUT: ${error.message}`);
      throw error;
    }
  }

  /**
   * 冻结LUT（移除权限，使其不可修改）
   * 
   * @param lutAddress LUT地址
   * @param authority 当前权限
   * @param payer 支付者
   * @returns 交易签名
   */
  async freezeLUT(
    lutAddress: PublicKey,
    authority: Keypair,
    payer: Keypair
  ): Promise<string> {
    try {
      lutLogger.info(`Freezing LUT ${lutAddress.toBase58()}`);

      const freezeInstruction = AddressLookupTableProgram.freezeLookupTable({
        lookupTable: lutAddress,
        authority: authority.publicKey,
      });

      const { blockhash } = await this.connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: blockhash,
        instructions: [freezeInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([payer, authority]);

      const signature = await this.connection.sendTransaction(transaction);
      await this.connection.confirmTransaction(signature);

      lutLogger.info(`✅ LUT frozen: ${signature}`);

      return signature;
    } catch (error: any) {
      lutLogger.error(`Failed to freeze LUT: ${error.message}`);
      throw error;
    }
  }

  /**
   * 关闭LUT（回收租金）
   * 
   * @param lutAddress LUT地址
   * @param authority 当前权限
   * @param recipient 租金接收者
   * @param payer 支付者
   * @returns 交易签名
   */
  async closeLUT(
    lutAddress: PublicKey,
    authority: Keypair,
    recipient: PublicKey,
    payer: Keypair
  ): Promise<string> {
    try {
      lutLogger.info(`Closing LUT ${lutAddress.toBase58()}`);

      const closeInstruction = AddressLookupTableProgram.closeLookupTable({
        lookupTable: lutAddress,
        authority: authority.publicKey,
        recipient,
      });

      const { blockhash } = await this.connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: blockhash,
        instructions: [closeInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([payer, authority]);

      const signature = await this.connection.sendTransaction(transaction);
      await this.connection.confirmTransaction(signature);

      lutLogger.info(`✅ LUT closed: ${signature}`);

      return signature;
    } catch (error: any) {
      lutLogger.error(`Failed to close LUT: ${error.message}`);
      throw error;
    }
  }

  /**
   * 导出LUT配置
   * 
   * @param lutAddress LUT地址
   * @returns LUT配置
   */
  async exportLUTConfig(lutAddress: PublicKey): Promise<LUTConfig> {
    const lut = await this.getLUT(lutAddress);
    
    if (!lut) {
      throw new Error(`LUT not found: ${lutAddress.toBase58()}`);
    }

    return {
      address: lutAddress,
      addresses: lut.state.addresses,
      createdSlot: Number(lut.state.deactivationSlot),
      lastExtendedSlot: lut.state.lastExtendedSlot,
    };
  }

  /**
   * 验证LUT是否包含指定地址
   * 
   * @param lutAddress LUT地址
   * @param address 要检查的地址
   * @returns 是否包含
   */
  async containsAddress(
    lutAddress: PublicKey,
    address: PublicKey
  ): Promise<boolean> {
    const lut = await this.getLUT(lutAddress);
    
    if (!lut) {
      return false;
    }

    return lut.state.addresses.some(addr => addr.equals(address));
  }

  /**
   * 批量检查地址
   * 
   * @param lutAddress LUT地址
   * @param addresses 要检查的地址列表
   * @returns 缺失的地址列表
   */
  async findMissingAddresses(
    lutAddress: PublicKey,
    addresses: PublicKey[]
  ): Promise<PublicKey[]> {
    const lut = await this.getLUT(lutAddress);
    
    if (!lut) {
      return addresses;
    }

    const lutAddresses = lut.state.addresses;
    const missing: PublicKey[] = [];

    for (const addr of addresses) {
      if (!lutAddresses.some(lutAddr => lutAddr.equals(addr))) {
        missing.push(addr);
      }
    }

    return missing;
  }
}
