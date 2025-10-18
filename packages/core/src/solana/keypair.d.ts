/**
 * 密钥管理器
 *
 * 负责加载、验证和管理 Solana 密钥对
 */
import { Keypair, Connection } from '@solana/web3.js';
/**
 * 密钥管理器类
 */
export declare class KeypairManager {
    /**
     * 从文件加载密钥对
     * @param filePath 密钥文件路径
     * @returns Keypair对象
     */
    static loadFromFile(filePath: string): Keypair;
    /**
     * 从加密文件加载密钥对（简化版，生产环境需要更强的加密）
     * @param filePath 密钥文件路径
     * @param password 密码（预留，暂未实现加密）
     * @returns Keypair对象
     */
    static loadEncrypted(filePath: string, password: string): Keypair;
    /**
     * 验证密钥对
     * @param keypair 要验证的密钥对
     * @returns 是否有效
     */
    static validateKeypair(keypair: Keypair): boolean;
    /**
     * 获取账户余额
     * @param connection Solana 连接
     * @param keypair 密钥对
     * @returns 余额（SOL）
     */
    static getBalance(connection: Connection, keypair: Keypair): Promise<number>;
    /**
     * 检查账户是否有足够余额
     * @param connection Solana 连接
     * @param keypair 密钥对
     * @param minBalanceSOL 最小余额（SOL）
     * @returns 是否有足够余额
     */
    static hasSufficientBalance(connection: Connection, keypair: Keypair, minBalanceSOL: number): Promise<boolean>;
    /**
     * 生成新的密钥对
     * @returns 新的Keypair
     */
    static generate(): Keypair;
    /**
     * 保存密钥对到文件
     * @param keypair 密钥对
     * @param filePath 保存路径
     */
    static saveToFile(keypair: Keypair, filePath: string): void;
    /**
     * 从 base58 私钥字符串创建密钥对
     * @param base58PrivateKey Base58编码的私钥
     * @returns Keypair对象
     */
    static fromBase58(base58PrivateKey: string): Keypair;
}
export default KeypairManager;
//# sourceMappingURL=keypair.d.ts.map