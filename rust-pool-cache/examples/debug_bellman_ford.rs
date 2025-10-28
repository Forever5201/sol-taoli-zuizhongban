/*!
 * Bellman-Ford调试 - 详细追踪
 */

use std::time::Instant;

fn main() {
    println!("====================================");
    println!("Bellman-Ford详细调试");
    println!("====================================\n");
    
    // 简单案例：USDC → SOL → USDC
    println!("测试案例: USDC → SOL → USDC");
    println!("  Pool A: SOL/USDC = 150.0 (Raydium)");
    println!("  Pool B: SOL/USDC = 151.0 (Lifinity)");
    println!();
    
    println!("手动计算:");
    let initial: f64 = 1000.0; // 1000 USDC
    println!("  起始: {} USDC", initial);
    
    // 步骤1: USDC → SOL (在价格150的池子买入)
    let rate1: f64 = 1.0 / 150.0; // 1 USDC = 1/150 SOL
    let dex_fee: f64 = 0.0025; // 0.25% Raydium费用
    let after_fee1 = initial * (1.0 - dex_fee);
    let sol_amount = after_fee1 * rate1;
    println!("  步骤1: {} USDC → {} SOL (费用扣除后)", after_fee1, sol_amount);
    println!("    汇率: {}", rate1);
    println!("    计算: {} × {} = {}", after_fee1, rate1, sol_amount);
    
    // 步骤2: SOL → USDC (在价格151的池子卖出)
    let rate2: f64 = 151.0; // 1 SOL = 151 USDC
    let dex_fee2: f64 = 0.0000; // 0% Lifinity费用
    let after_fee2 = sol_amount * (1.0 - dex_fee2);
    let final_usdc = after_fee2 * rate2;
    println!("  步骤2: {} SOL → {} USDC (费用扣除后)", after_fee2, final_usdc);
    println!("    汇率: {}", rate2);
    println!("    计算: {} × {} = {}", after_fee2, rate2, final_usdc);
    
    println!();
    println!("最终结果:");
    println!("  输入: {} USDC", initial);
    println!("  输出: {} USDC", final_usdc);
    let gross_profit = final_usdc - initial;
    let gas_fee = 0.0001;
    let net_profit = gross_profit - gas_fee;
    let roi = (net_profit / initial) * 100.0;
    println!("  毛利润: {} USDC", gross_profit);
    println!("  Gas费: {} USDC", gas_fee);
    println!("  净利润: {} USDC", net_profit);
    println!("  ROI: {:.4}%", roi);
    println!();
    
    println!("预期Bellman-Ford输出: ROI约{:.4}%", roi);
    println!("====================================\n");
}






