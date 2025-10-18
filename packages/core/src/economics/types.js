"use strict";
/**
 * 经济模型核心类型定义
 *
 * 这些类型定义了套利系统的成本结构、利润分析、风险管理等关键概念
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLASH_LOAN_FEE_RATE = exports.BASE_FEE_PER_SIGNATURE = exports.LAMPORTS_PER_SOL = void 0;
exports.formatLamportsToSOL = formatLamportsToSOL;
exports.formatPercentage = formatPercentage;
// ============================================================================
// 辅助类型
// ============================================================================
/**
 * 将 lamports 转换为 SOL 的辅助常量
 */
exports.LAMPORTS_PER_SOL = 1_000_000_000;
/**
 * Solana 基础交易费（每个签名）
 */
exports.BASE_FEE_PER_SIGNATURE = 5_000;
/**
 * Solend 闪电贷费率
 */
exports.FLASH_LOAN_FEE_RATE = 0.0009; // 0.09%
/**
 * 格式化 lamports 为 SOL 字符串
 */
function formatLamportsToSOL(lamports) {
    return (lamports / exports.LAMPORTS_PER_SOL).toFixed(9) + ' SOL';
}
/**
 * 格式化百分比
 */
function formatPercentage(value) {
    return (value * 100).toFixed(2) + '%';
}
//# sourceMappingURL=types.js.map