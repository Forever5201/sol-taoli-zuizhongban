/**
 * 经济模型核心类型定义
 *
 * 这些类型定义了套利系统的成本结构、利润分析、风险管理等关键概念
 */
/**
 * 交易成本配置
 */
export interface CostConfig {
    /** 签名数量（通常 2-4 个） */
    signatureCount: number;
    /** 计算单元数量 */
    computeUnits: number;
    /** 计算单元价格（microLamports） */
    computeUnitPrice: number;
    /** 是否使用闪电贷 */
    useFlashLoan: boolean;
    /** 闪电贷金额（lamports，可选） */
    flashLoanAmount?: number;
    /** RPC 成本（lamports，分摊） */
    rpcCostPerTransaction?: number;
}
/**
 * 交易成本明细
 */
export interface TransactionCosts {
    /** 基础交易费（lamports） */
    baseFee: number;
    /** 优先费（lamports） */
    priorityFee: number;
    /** Jito 小费（lamports） */
    jitoTip: number;
    /** RPC 成本（lamports） */
    rpcCost: number;
    /** 闪电贷费用（lamports，可选） */
    flashLoanFee?: number;
    /** 总成本（lamports） */
    total: number;
    /** 成本明细（用于调试） */
    breakdown?: {
        baseFee: string;
        priorityFee: string;
        jitoTip: string;
        rpcCost: string;
        flashLoanFee?: string;
        total: string;
    };
}
/**
 * Jito 小费数据（从 API 获取）
 */
export interface JitoTipData {
    /** 时间戳 */
    time: string;
    /** 25th 百分位小费（SOL） */
    landed_tips_25th_percentile: number;
    /** 50th 百分位小费（SOL） */
    landed_tips_50th_percentile: number;
    /** 75th 百分位小费（SOL） */
    landed_tips_75th_percentile: number;
    /** 95th 百分位小费（SOL） */
    landed_tips_95th_percentile: number;
    /** 99th 百分位小费（SOL） */
    landed_tips_99th_percentile: number;
    /** EMA 50th 百分位小费（SOL） */
    ema_landed_tips_50th_percentile: number;
}
/**
 * 资金量级
 */
export type CapitalSize = 'small' | 'medium' | 'large';
/**
 * Jito 小费策略
 */
export type JitoTipStrategy = 'conservative' | 'balanced' | 'aggressive';
/**
 * 竞争指标
 */
export interface CompetitionMetrics {
    /** 交易对 24h 成交量（USD） */
    tokenPairVolume: number;
    /** 过去 1h 的套利次数 */
    historicalArbCount: number;
    /** 过去 10 分钟平均小费（lamports） */
    averageTipLast10min: number;
    /** 失败 Bundle 比例（0-1） */
    failedBundleRate: number;
}
/**
 * Bundle 执行结果
 */
export interface BundleResult {
    /** Bundle ID */
    bundleId: string;
    /** 是否成功 */
    success: boolean;
    /** 小费金额（lamports） */
    tip: number;
    /** 利润（lamports，成功时） */
    profit?: number;
    /** 交易对标识 */
    tokenPair: string;
    /** 时间戳 */
    timestamp: number;
}
/**
 * 套利机会
 */
export interface ArbitrageOpportunity {
    /** 交易对标识（如 "SOL/USDC"） */
    tokenPair: string;
    /** 输入代币 */
    inputMint: string;
    /** 输出代币 */
    outputMint: string;
    /** 输入金额（lamports） */
    inputAmount: number;
    /** 预期输出金额（lamports） */
    expectedOutput: number;
    /** 毛利润（lamports） */
    grossProfit: number;
    /** 交易路径（DEX 列表） */
    route: string[];
    /** 池子流动性（USD） */
    poolLiquidity: number;
    /** 预估滑点（0-1） */
    estimatedSlippage: number;
    /** 发现时间戳 */
    discoveredAt: number;
}
/**
 * 利润分析结果
 */
export interface ProfitAnalysis {
    /** 毛利润（lamports） */
    grossProfit: number;
    /** 总成本（lamports） */
    totalCost: number;
    /** 净利润（lamports） */
    netProfit: number;
    /** 投资回报率（百分比） */
    roi: number;
    /** 成本占比（0-1） */
    costRatio: number;
    /** 是否盈利 */
    isProfitable: boolean;
    /** 详细成本 */
    costs: TransactionCosts;
}
/**
 * 风险检查配置
 */
export interface RiskCheckConfig {
    /** 最小利润门槛（lamports） */
    minProfitThreshold: number;
    /** 最大 Gas 价格（lamports） */
    maxGasPrice: number;
    /** 最大 Jito 小费（lamports） */
    maxJitoTip: number;
    /** 最大滑点（0-1） */
    maxSlippage: number;
    /** 最小流动性（USD） */
    minLiquidity: number;
    /** 最小 ROI（百分比） */
    minROI: number;
}
/**
 * 风险检查结果
 */
export interface RiskCheckResult {
    /** 是否通过检查 */
    passed: boolean;
    /** 失败原因（如果未通过） */
    reason?: string;
    /** 具体检查项结果 */
    checks: {
        profitThreshold: boolean;
        costLimit: boolean;
        slippage: boolean;
        liquidity: boolean;
        roi: boolean;
    };
}
/**
 * 熔断配置
 */
export interface CircuitBreakerConfig {
    /** 最大连续失败次数 */
    maxConsecutiveFailures: number;
    /** 最大小时亏损（lamports） */
    maxHourlyLoss: number;
    /** 最小成功率（0-1） */
    minSuccessRate: number;
}
/**
 * 熔断状态
 */
export type CircuitBreakerStatus = 'closed' | 'open' | 'half-open';
/**
 * 交易结果
 */
export interface TransactionResult {
    /** 是否成功 */
    success: boolean;
    /** 利润（lamports，成功时） */
    profit?: number;
    /** 成本（lamports，失败时） */
    cost?: number;
    /** 交易签名 */
    signature?: string;
    /** 时间戳 */
    timestamp: number;
    /** 错误信息（失败时） */
    error?: string;
}
/**
 * 熔断指标
 */
export interface CircuitBreakerMetrics {
    /** 连续失败次数 */
    consecutiveFailures: number;
    /** 小时利润（lamports） */
    hourlyProfit: number;
    /** 小时亏损（lamports） */
    hourlyLoss: number;
    /** 总尝试次数 */
    totalAttempts: number;
    /** 成功次数 */
    successCount: number;
    /** 成功率（0-1） */
    successRate: number;
    /** 净利润（lamports） */
    netProfit: number;
    /** 统计开始时间 */
    startTime: number;
}
/**
 * 熔断检查结果
 */
export interface CircuitBreakerCheckResult {
    /** 是否应该熔断 */
    shouldBreak: boolean;
    /** 熔断原因 */
    reason?: string;
    /** 当前指标 */
    metrics: CircuitBreakerMetrics;
}
/**
 * 策略配置
 */
export interface StrategyConfig {
    /** 资金量级 */
    capitalSize: CapitalSize;
    /** 是否使用闪电贷（'auto' 表示自动判断） */
    useFlashLoan: boolean | 'auto';
    /** 目标成功率（0-1） */
    targetSuccessRate: number;
    /** 风险检查配置 */
    riskChecks: RiskCheckConfig;
    /** 熔断配置 */
    circuitBreaker: CircuitBreakerConfig;
    /** Jito 小费策略 */
    jitoTipStrategy: JitoTipStrategy;
}
/**
 * 全局配置（从 TOML 加载）
 */
export interface GlobalConfig {
    /** RPC 端点 */
    rpcUrl: string;
    /** Jito Block Engine URL */
    jitoBlockEngineUrl: string;
    /** 密钥路径 */
    keypairPath: string;
    /** 监控 Webhook URL（可选） */
    webhookUrl?: string;
    /** 日志级别 */
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
/**
 * 将 lamports 转换为 SOL 的辅助常量
 */
export declare const LAMPORTS_PER_SOL = 1000000000;
/**
 * Solana 基础交易费（每个签名）
 */
export declare const BASE_FEE_PER_SIGNATURE = 5000;
/**
 * Solend 闪电贷费率
 */
export declare const FLASH_LOAN_FEE_RATE = 0.0009;
/**
 * 格式化 lamports 为 SOL 字符串
 */
export declare function formatLamportsToSOL(lamports: number): string;
/**
 * 格式化百分比
 */
export declare function formatPercentage(value: number): string;
//# sourceMappingURL=types.d.ts.map