"use strict";
/**
 * 风险管理器
 *
 * 实现多层次的风险检查和保护机制，包括：
 * - 交易前风险检查
 * - 流动性验证
 * - 滑点保护
 * - 成本效益分析
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskManager = void 0;
const profit_analyzer_1 = require("./profit-analyzer");
/**
 * 风险管理器
 */
class RiskManager {
    profitAnalyzer;
    constructor(profitAnalyzer) {
        this.profitAnalyzer = profitAnalyzer || new profit_analyzer_1.ProfitAnalyzer();
    }
    /**
     * 执行完整的交易前风险检查
     * @param opportunity 套利机会
     * @param analysis 利润分析结果
     * @param config 风险检查配置
     * @returns 风险检查结果
     */
    preExecutionCheck(opportunity, analysis, config) {
        const checks = {
            profitThreshold: this.checkProfitThreshold(analysis, config),
            costLimit: this.checkCostLimit(analysis, config),
            slippage: this.checkSlippage(opportunity, config),
            liquidity: this.checkLiquidity(opportunity, config),
            roi: this.checkROI(analysis, config),
        };
        const passed = Object.values(checks).every((check) => check);
        let reason;
        if (!passed) {
            reason = this.getFailureReason(checks, opportunity, analysis, config);
        }
        return {
            passed,
            reason,
            checks,
        };
    }
    /**
     * 检查利润门槛
     */
    checkProfitThreshold(analysis, config) {
        return analysis.netProfit >= config.minProfitThreshold;
    }
    /**
     * 检查成本限制
     */
    checkCostLimit(analysis, config) {
        const { costs } = analysis;
        // 检查优先费
        if (costs.priorityFee > config.maxGasPrice) {
            return false;
        }
        // 检查 Jito 小费
        if (costs.jitoTip > config.maxJitoTip) {
            return false;
        }
        return true;
    }
    /**
     * 检查滑点
     */
    checkSlippage(opportunity, config) {
        return opportunity.estimatedSlippage <= config.maxSlippage;
    }
    /**
     * 检查流动性
     */
    checkLiquidity(opportunity, config) {
        return opportunity.poolLiquidity >= config.minLiquidity;
    }
    /**
     * 检查 ROI
     */
    checkROI(analysis, config) {
        return analysis.roi >= config.minROI;
    }
    /**
     * 生成失败原因描述
     */
    getFailureReason(checks, opportunity, analysis, config) {
        const reasons = [];
        if (!checks.profitThreshold) {
            reasons.push(`利润不足: ${analysis.netProfit} < ${config.minProfitThreshold} lamports`);
        }
        if (!checks.costLimit) {
            if (analysis.costs.priorityFee > config.maxGasPrice) {
                reasons.push(`优先费过高: ${analysis.costs.priorityFee} > ${config.maxGasPrice} lamports`);
            }
            if (analysis.costs.jitoTip > config.maxJitoTip) {
                reasons.push(`Jito 小费过高: ${analysis.costs.jitoTip} > ${config.maxJitoTip} lamports`);
            }
        }
        if (!checks.slippage) {
            reasons.push(`滑点过大: ${(opportunity.estimatedSlippage * 100).toFixed(2)}% > ${(config.maxSlippage * 100).toFixed(2)}%`);
        }
        if (!checks.liquidity) {
            reasons.push(`流动性不足: $${opportunity.poolLiquidity.toFixed(0)} < $${config.minLiquidity.toFixed(0)}`);
        }
        if (!checks.roi) {
            reasons.push(`ROI 过低: ${analysis.roi.toFixed(2)}% < ${config.minROI}%`);
        }
        return reasons.join('; ');
    }
    /**
     * 验证机会有效性
     * @param opportunity 套利机会
     * @returns 是否有效
     */
    validateOpportunity(opportunity) {
        // 检查基本数据完整性
        if (!opportunity.inputMint || !opportunity.outputMint) {
            return { valid: false, reason: '代币信息不完整' };
        }
        if (opportunity.inputAmount <= 0) {
            return { valid: false, reason: '输入金额无效' };
        }
        if (opportunity.expectedOutput <= opportunity.inputAmount) {
            return { valid: false, reason: '无利润空间' };
        }
        if (opportunity.grossProfit <= 0) {
            return { valid: false, reason: '毛利润为负' };
        }
        if (opportunity.route.length === 0) {
            return { valid: false, reason: '交易路径为空' };
        }
        if (opportunity.poolLiquidity <= 0) {
            return { valid: false, reason: '流动性数据异常' };
        }
        if (opportunity.estimatedSlippage < 0 || opportunity.estimatedSlippage > 1) {
            return { valid: false, reason: '滑点数据异常' };
        }
        // 检查机会是否过期（超过 5 秒）
        const age = Date.now() - opportunity.discoveredAt;
        if (age > 5000) {
            return { valid: false, reason: `机会已过期（${(age / 1000).toFixed(1)}s）` };
        }
        return { valid: true };
    }
    /**
     * 评估机会风险等级
     * @param opportunity 套利机会
     * @param analysis 利润分析
     * @returns 风险等级（low, medium, high）
     */
    assessRiskLevel(opportunity, analysis) {
        let riskScore = 0;
        // 1. 滑点风险（权重 30%）
        if (opportunity.estimatedSlippage > 0.02) {
            riskScore += 30;
        }
        else if (opportunity.estimatedSlippage > 0.01) {
            riskScore += 15;
        }
        // 2. 流动性风险（权重 25%）
        if (opportunity.poolLiquidity < 10_000) {
            riskScore += 25;
        }
        else if (opportunity.poolLiquidity < 50_000) {
            riskScore += 12;
        }
        // 3. 成本占比风险（权重 20%）
        if (analysis.costRatio > 0.7) {
            riskScore += 20;
        }
        else if (analysis.costRatio > 0.5) {
            riskScore += 10;
        }
        // 4. ROI 风险（权重 15%）
        if (analysis.roi < 30) {
            riskScore += 15;
        }
        else if (analysis.roi < 50) {
            riskScore += 7;
        }
        // 5. 路径复杂度风险（权重 10%）
        if (opportunity.route.length > 3) {
            riskScore += 10;
        }
        else if (opportunity.route.length > 2) {
            riskScore += 5;
        }
        // 评级
        if (riskScore >= 50) {
            return 'high';
        }
        else if (riskScore >= 25) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
    /**
     * 计算推荐的交易金额
     * @param opportunity 套利机会
     * @param availableCapital 可用资金（lamports）
     * @param riskTolerance 风险容忍度（0-1）
     * @returns 推荐交易金额（lamports）
     */
    calculateRecommendedAmount(opportunity, availableCapital, riskTolerance = 0.5) {
        // 基础金额（池子流动性的 1-5%）
        const liquidityInLamports = opportunity.poolLiquidity * 1_000_000_000 / 200; // 假设 SOL = $200
        const baseAmount = liquidityInLamports * (0.01 + riskTolerance * 0.04);
        // 考虑滑点影响
        const slippageAdjustment = 1 - opportunity.estimatedSlippage * 2;
        const adjustedAmount = baseAmount * slippageAdjustment;
        // 不超过可用资金的 20-80%（根据风险容忍度）
        const maxPercentage = 0.2 + riskTolerance * 0.6;
        const maxAmount = availableCapital * maxPercentage;
        return Math.min(adjustedAmount, maxAmount, opportunity.inputAmount);
    }
    /**
     * 检查是否应该使用闪电贷
     * @param opportunityAmount 机会所需金额（lamports）
     * @param availableCapital 可用资金（lamports）
     * @param expectedProfit 预期利润（lamports）
     * @returns 是否应该使用闪电贷
     */
    shouldUseFlashLoan(opportunityAmount, availableCapital, expectedProfit) {
        // 1. 如果资金足够，且闪电贷费用会显著减少利润，则不使用
        if (availableCapital >= opportunityAmount) {
            const flashLoanFee = opportunityAmount * 0.0009;
            if (flashLoanFee > expectedProfit * 0.3) {
                return false; // 闪电贷费用超过利润的 30%
            }
        }
        // 2. 如果资金不足，必须使用闪电贷
        if (availableCapital < opportunityAmount) {
            return true;
        }
        // 3. 如果利润足够大，使用闪电贷可以放大收益
        const flashLoanFee = opportunityAmount * 0.0009;
        if (expectedProfit > flashLoanFee * 10) {
            return true; // 利润是闪电贷费用的 10 倍以上
        }
        // 4. 默认：小金额不使用，大金额使用
        return opportunityAmount > 10_000_000_000; // 10 SOL
    }
    /**
     * 生成风险报告
     * @param opportunity 套利机会
     * @param analysis 利润分析
     * @param checkResult 风险检查结果
     * @returns 格式化的风险报告
     */
    generateRiskReport(opportunity, analysis, checkResult) {
        const riskLevel = this.assessRiskLevel(opportunity, analysis);
        const validation = this.validateOpportunity(opportunity);
        const lines = [
            '========== 风险评估报告 ==========',
            `交易对: ${opportunity.tokenPair}`,
            `路径: ${opportunity.route.join(' → ')}`,
            `风险等级: ${riskLevel.toUpperCase()}`,
            '',
            '检查项:',
            `  ✓ 数据有效性: ${validation.valid ? '通过' : '❌ ' + validation.reason}`,
            `  ${checkResult.checks.profitThreshold ? '✓' : '❌'} 利润门槛: ${checkResult.checks.profitThreshold ? '通过' : '未通过'}`,
            `  ${checkResult.checks.costLimit ? '✓' : '❌'} 成本限制: ${checkResult.checks.costLimit ? '通过' : '未通过'}`,
            `  ${checkResult.checks.slippage ? '✓' : '❌'} 滑点检查: ${checkResult.checks.slippage ? '通过' : '未通过'}`,
            `  ${checkResult.checks.liquidity ? '✓' : '❌'} 流动性检查: ${checkResult.checks.liquidity ? '通过' : '未通过'}`,
            `  ${checkResult.checks.roi ? '✓' : '❌'} ROI 检查: ${checkResult.checks.roi ? '通过' : '未通过'}`,
            '',
            `总体评估: ${checkResult.passed ? '✅ 可执行' : '❌ 不建议执行'}`,
        ];
        if (!checkResult.passed && checkResult.reason) {
            lines.push(`原因: ${checkResult.reason}`);
        }
        lines.push('==================================');
        return lines.join('\n');
    }
}
exports.RiskManager = RiskManager;
//# sourceMappingURL=risk-manager.js.map