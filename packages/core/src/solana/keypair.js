"use strict";
/**
 * 密钥管理器
 *
 * 负责加载、验证和管理 Solana 密钥对
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeypairManager = void 0;
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../logger");
const keypairLogger = logger_1.logger.child({ module: 'KeypairManager' });
/**
 * 密钥管理器类
 */
class KeypairManager {
    /**
     * 从文件加载密钥对
     * @param filePath 密钥文件路径
     * @returns Keypair对象
     */
    static loadFromFile(filePath) {
        try {
            const absolutePath = path_1.default.resolve(filePath);
            if (!fs_1.default.existsSync(absolutePath)) {
                throw new Error(`Keypair file not found: ${absolutePath}`);
            }
            const secretKeyString = fs_1.default.readFileSync(absolutePath, 'utf-8');
            const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
            const keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
            keypairLogger.info(`Keypair loaded: ${keypair.publicKey.toBase58()}`);
            return keypair;
        }
        catch (error) {
            keypairLogger.error(`Failed to load keypair: ${error}`);
            throw error;
        }
    }
    /**
     * 从加密文件加载密钥对（简化版，生产环境需要更强的加密）
     * @param filePath 密钥文件路径
     * @param password 密码（预留，暂未实现加密）
     * @returns Keypair对象
     */
    static loadEncrypted(filePath, password) {
        // 简化实现：暂时与 loadFromFile 相同
        // 生产环境应使用 argon2 或类似库进行加密
        keypairLogger.warn('Encrypted keypair loading not implemented, using plain file');
        return this.loadFromFile(filePath);
    }
    /**
     * 验证密钥对
     * @param keypair 要验证的密钥对
     * @returns 是否有效
     */
    static validateKeypair(keypair) {
        try {
            // 检查公钥是否有效
            const pubkey = keypair.publicKey.toBase58();
            if (pubkey.length === 0) {
                return false;
            }
            // 尝试签名一条测试消息
            const testMessage = Buffer.from('test');
            const signature = keypair.sign(testMessage);
            return signature.length === 64;
        }
        catch (error) {
            keypairLogger.error(`Keypair validation failed: ${error}`);
            return false;
        }
    }
    /**
     * 获取账户余额
     * @param connection Solana 连接
     * @param keypair 密钥对
     * @returns 余额（SOL）
     */
    static async getBalance(connection, keypair) {
        try {
            const balance = await connection.getBalance(keypair.publicKey);
            const balanceInSOL = balance / web3_js_1.LAMPORTS_PER_SOL;
            keypairLogger.debug(`Balance for ${keypair.publicKey.toBase58()}: ${balanceInSOL} SOL`);
            return balanceInSOL;
        }
        catch (error) {
            keypairLogger.error(`Failed to get balance: ${error}`);
            throw error;
        }
    }
    /**
     * 检查账户是否有足够余额
     * @param connection Solana 连接
     * @param keypair 密钥对
     * @param minBalanceSOL 最小余额（SOL）
     * @returns 是否有足够余额
     */
    static async hasSufficientBalance(connection, keypair, minBalanceSOL) {
        const balance = await this.getBalance(connection, keypair);
        return balance >= minBalanceSOL;
    }
    /**
     * 生成新的密钥对
     * @returns 新的Keypair
     */
    static generate() {
        const keypair = web3_js_1.Keypair.generate();
        keypairLogger.info(`Generated new keypair: ${keypair.publicKey.toBase58()}`);
        return keypair;
    }
    /**
     * 保存密钥对到文件
     * @param keypair 密钥对
     * @param filePath 保存路径
     */
    static saveToFile(keypair, filePath) {
        try {
            const absolutePath = path_1.default.resolve(filePath);
            const secretKey = Array.from(keypair.secretKey);
            fs_1.default.writeFileSync(absolutePath, JSON.stringify(secretKey));
            keypairLogger.info(`Keypair saved to ${absolutePath}`);
        }
        catch (error) {
            keypairLogger.error(`Failed to save keypair: ${error}`);
            throw error;
        }
    }
    /**
     * 从 base58 私钥字符串创建密钥对
     * @param base58PrivateKey Base58编码的私钥
     * @returns Keypair对象
     */
    static fromBase58(base58PrivateKey) {
        try {
            const bs58 = require('bs58');
            const secretKey = bs58.decode(base58PrivateKey);
            return web3_js_1.Keypair.fromSecretKey(secretKey);
        }
        catch (error) {
            keypairLogger.error(`Failed to create keypair from base58: ${error}`);
            throw error;
        }
    }
}
exports.KeypairManager = KeypairManager;
exports.default = KeypairManager;
//# sourceMappingURL=keypair.js.map