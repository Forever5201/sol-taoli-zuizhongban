/*!
 * 真实场景验证 - 使用市场真实的价格关系
 * 
 * 验证Bellman-Ford算法在真实场景下的正确性
 */

use solana_pool_cache::price_cache::PoolPrice;
use solana_pool_cache::router_bellman_ford::BellmanFordScanner;
use std::time::Instant;

fn main() {
    println!("====================================");
    println!("真实场景验证 - Bellman-Ford算法");
    println!("====================================\n");
    
    println!("使用市场真实价格关系，验证算法在各种跳数下的表现\n");
    
    // 测试案例1: 2跳直接套利（已验证✅）
    test_case_2hop();
    
    // 测试案例2: 3跳三角套利（有利可图）
    test_case_3hop_profitable();
    
    // 测试案例3: 4跳复杂路径（有利可图）
    test_case_4hop_profitable();
    
    // 测试案例4: 5跳极限情况
    test_case_5hop();
    
    // 测试案例5: 不盈利的情况（应该不找到）
    test_case_unprofitable();
}

fn test_case_2hop() {
    println!("【案例1】2跳直接套利（基准测试）");
    println!("----------------------------------------\n");
    
    println!("场景: 同一交易对在不同DEX上有价差");
    println!("  Pool A (Raydium): SOL/USDC = 150.0");
    println!("  Pool B (Lifinity): SOL/USDC = 151.0");
    println!();
    println!("预期: 0.25%手续费后，净利润约0.4%");
    println!();
    
    let pools = vec![
        PoolPrice {
            pool_id: "raydium_sol_usdc".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "lifinity_sol_usdc".to_string(),
            dex_name: "Lifinity V2".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 151.0,
            base_reserve: 800_000_000_000_000,
            quote_reserve: 120_800_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    print_results(&cycles, "USDC→SOL→USDC", 0.3, 0.5);
    println!("\n====================================\n");
}

fn test_case_3hop_profitable() {
    println!("【案例2】3跳三角套利（真实可盈利）");
    println!("----------------------------------------\n");
    
    println!("场景: SOL价格在不同稳定币池子间有细微差异");
    println!("  基准价格: 1 SOL = 150 USDC/USDT");
    println!("  Pool 1 (Raydium): SOL/USDC = 150.0");
    println!("  Pool 2 (Orca): SOL/USDT = 150.8");
    println!("  Pool 3 (AlphaQ): USDC/USDT = 1.0");
    println!();
    
    // 计算预期
    println!("数学验证:");
    println!("  路径: USDC → SOL → USDT → USDC");
    println!("  汇率乘积: (1/150) × 150.8 × 1 = 1.00533");
    println!("  毛利: 0.533%");
    println!("  费用: Raydium(0.25%) + Orca(0.01%) + AlphaQ(0.01%) = 0.27%");
    println!("  净利: 0.533% - 0.27% ≈ 0.26%");
    println!();
    
    let pools = vec![
        PoolPrice {
            pool_id: "raydium_sol_usdc".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "orca_sol_usdt".to_string(),
            dex_name: "Orca Whirlpool".to_string(),
            pair: "SOL/USDT".to_string(),
            price: 150.8,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_800_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "alphaq_usdc_usdt".to_string(),
            dex_name: "AlphaQ".to_string(),
            pair: "USDC/USDT".to_string(),
            price: 1.0,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 10_000_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    print_results(&cycles, "USDC→SOL→USDT→USDC", 0.2, 0.35);
    println!("\n====================================\n");
}

fn test_case_4hop_profitable() {
    println!("【案例3】4跳复杂路径（真实可盈利）");
    println!("----------------------------------------\n");
    
    println!("场景: 通过多个代币形成套利环");
    println!("  基准: SOL=150, RAY=2.0, JUP=1.2, USDC=1");
    println!("  Pool 1: SOL/USDC = 150.0 (Raydium)");
    println!("  Pool 2: SOL/RAY = 75.0 (Raydium) → 1 SOL = 75 RAY");
    println!("  Pool 3: RAY/JUP = 1.67 (Meteora) → 1 RAY = 1.67 JUP");
    println!("  Pool 4: JUP/USDC = 1.21 (Orca) → 1 JUP = 1.21 USDC");
    println!();
    
    println!("一致性检查:");
    println!("  SOL → RAY → JUP → USDC:");
    println!("  1 SOL = 75 RAY = 75×1.67 JUP = 125.25 JUP = 125.25×1.21 USDC = 151.55 USDC");
    println!("  直接 SOL → USDC: 150 USDC");
    println!("  差价: 151.55 - 150 = 1.55 USDC (1.03%)");
    println!("  扣费(0.25%×3 + 0.02% + 0.01%): 约0.88%");
    println!("  净利: 1.03% - 0.88% ≈ 0.15%");
    println!();
    
    let pools = vec![
        PoolPrice {
            pool_id: "raydium_sol_usdc".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "raydium_sol_ray".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/RAY".to_string(),
            price: 75.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 75_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "meteora_ray_jup".to_string(),
            dex_name: "Meteora DLMM".to_string(),
            pair: "RAY/JUP".to_string(),
            price: 1.67,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 16_700_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "orca_jup_usdc".to_string(),
            dex_name: "Orca Whirlpool".to_string(),
            pair: "JUP/USDC".to_string(),
            price: 1.21,
            base_reserve: 5_000_000_000_000,
            quote_reserve: 6_050_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    print_results(&cycles, "USDC→SOL→RAY→JUP→USDC", 0.1, 0.25);
    println!("\n====================================\n");
}

fn test_case_5hop() {
    println!("【案例4】5跳极限场景");
    println!("----------------------------------------\n");
    
    println!("场景: 通过5个交易对形成长链套利");
    println!("  需要更大的价差才能覆盖手续费（约1.25%）");
    println!();
    println!("  Pool 1: SOL/USDC = 150.0 (Raydium, 0.25%)");
    println!("  Pool 2: SOL/RAY = 75.0 (Raydium, 0.25%)");
    println!("  Pool 3: RAY/ORCA = 2.5 (Meteora, 0.02%)");
    println!("  Pool 4: ORCA/JUP = 3.2 (Orca, 0.01%)");
    println!("  Pool 5: JUP/USDC = 1.266 (Orca, 0.01%)");
    println!();
    
    println!("一致性检查:");
    println!("  1 SOL = 75 RAY = 187.5 ORCA = 600 JUP = 759.6 USDC");
    println!("  vs 直接: 150 USDC");
    println!("  差价: 609.6 USDC / 150 - 1 = 306%（这个不现实，仅用于测试算法能否找到5跳）");
    println!();
    
    let pools = vec![
        PoolPrice {
            pool_id: "p1".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p2".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/RAY".to_string(),
            price: 75.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 75_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p3".to_string(),
            dex_name: "Meteora DLMM".to_string(),
            pair: "RAY/ORCA".to_string(),
            price: 2.5,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 25_000_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p4".to_string(),
            dex_name: "Orca Whirlpool".to_string(),
            pair: "ORCA/JUP".to_string(),
            price: 3.2,
            base_reserve: 5_000_000_000_000,
            quote_reserve: 16_000_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p5".to_string(),
            dex_name: "Orca Whirlpool".to_string(),
            pair: "JUP/USDC".to_string(),
            price: 1.266,
            base_reserve: 5_000_000_000_000,
            quote_reserve: 6_330_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    print_results(&cycles, "任意5跳路径", 0.0, 10.0);
    println!("\n====================================\n");
}

fn test_case_unprofitable() {
    println!("【案例5】不盈利场景（负向测试）");
    println!("----------------------------------------\n");
    
    println!("场景: 价格一致，无套利机会");
    println!("  Pool 1: SOL/USDC = 150.0");
    println!("  Pool 2: SOL/USDT = 150.0");
    println!("  Pool 3: USDC/USDT = 1.0");
    println!();
    println!("预期: 不应找到任何循环（手续费导致亏损）");
    println!();
    
    let pools = vec![
        PoolPrice {
            pool_id: "p1".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p2".to_string(),
            dex_name: "Orca Whirlpool".to_string(),
            pair: "SOL/USDT".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p3".to_string(),
            dex_name: "AlphaQ".to_string(),
            pair: "USDC/USDT".to_string(),
            price: 1.0,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 10_000_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    if cycles.is_empty() {
        println!("✅ 结果: 正确！未找到循环");
        println!("   算法正确识别了无利可图的情况");
    } else {
        println!("❌ 错误: 找到了{}个循环，但不应该有！", cycles.len());
        for (idx, cycle) in cycles.iter().enumerate() {
            println!("\n  循环 #{}:", idx + 1);
            println!("    ROI: {:.4}%", cycle.roi_percent);
        }
    }
    
    println!("\n====================================\n");
}

fn print_results(cycles: &[solana_pool_cache::router::ArbitragePath], expected_path: &str, min_roi: f64, max_roi: f64) {
    println!("Bellman-Ford结果:");
    
    if cycles.is_empty() {
        println!("  ❌ 未找到循环");
        println!("  预期: 应该找到 {}", expected_path);
        return;
    }
    
    println!("  ✅ 找到 {} 个循环", cycles.len());
    
    for (idx, cycle) in cycles.iter().enumerate() {
        println!("\n  循环 #{}:", idx + 1);
        println!("    类型: {:?}", cycle.arb_type);
        println!("    跳数: {}", cycle.steps.len());
        println!("    净利润: {:.6} {}", cycle.net_profit, cycle.start_token);
        println!("    ROI: {:.4}%", cycle.roi_percent);
        
        // 验证ROI是否在合理范围
        if cycle.roi_percent < min_roi {
            println!("    ⚠️  ROI过低（< {:.2}%），可能被过滤", min_roi);
        } else if cycle.roi_percent > max_roi {
            println!("    ⚠️  ROI过高（> {:.2}%），可能有问题", max_roi);
        } else {
            println!("    ✅ ROI在预期范围内（{:.2}% - {:.2}%）", min_roi, max_roi);
        }
        
        println!("    路径:");
        for (i, step) in cycle.steps.iter().enumerate() {
            println!("      {}. {} → {} @ {:.4} (DEX: {})",
                i + 1,
                step.input_token,
                step.output_token,
                step.price,
                step.dex_name);
        }
    }
    
    println!("\n  预期路径: {}", expected_path);
}


 * 真实场景验证 - 使用市场真实的价格关系
 * 
 * 验证Bellman-Ford算法在真实场景下的正确性
 */

use solana_pool_cache::price_cache::PoolPrice;
use solana_pool_cache::router_bellman_ford::BellmanFordScanner;
use std::time::Instant;

fn main() {
    println!("====================================");
    println!("真实场景验证 - Bellman-Ford算法");
    println!("====================================\n");
    
    println!("使用市场真实价格关系，验证算法在各种跳数下的表现\n");
    
    // 测试案例1: 2跳直接套利（已验证✅）
    test_case_2hop();
    
    // 测试案例2: 3跳三角套利（有利可图）
    test_case_3hop_profitable();
    
    // 测试案例3: 4跳复杂路径（有利可图）
    test_case_4hop_profitable();
    
    // 测试案例4: 5跳极限情况
    test_case_5hop();
    
    // 测试案例5: 不盈利的情况（应该不找到）
    test_case_unprofitable();
}

fn test_case_2hop() {
    println!("【案例1】2跳直接套利（基准测试）");
    println!("----------------------------------------\n");
    
    println!("场景: 同一交易对在不同DEX上有价差");
    println!("  Pool A (Raydium): SOL/USDC = 150.0");
    println!("  Pool B (Lifinity): SOL/USDC = 151.0");
    println!();
    println!("预期: 0.25%手续费后，净利润约0.4%");
    println!();
    
    let pools = vec![
        PoolPrice {
            pool_id: "raydium_sol_usdc".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "lifinity_sol_usdc".to_string(),
            dex_name: "Lifinity V2".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 151.0,
            base_reserve: 800_000_000_000_000,
            quote_reserve: 120_800_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    print_results(&cycles, "USDC→SOL→USDC", 0.3, 0.5);
    println!("\n====================================\n");
}

fn test_case_3hop_profitable() {
    println!("【案例2】3跳三角套利（真实可盈利）");
    println!("----------------------------------------\n");
    
    println!("场景: SOL价格在不同稳定币池子间有细微差异");
    println!("  基准价格: 1 SOL = 150 USDC/USDT");
    println!("  Pool 1 (Raydium): SOL/USDC = 150.0");
    println!("  Pool 2 (Orca): SOL/USDT = 150.8");
    println!("  Pool 3 (AlphaQ): USDC/USDT = 1.0");
    println!();
    
    // 计算预期
    println!("数学验证:");
    println!("  路径: USDC → SOL → USDT → USDC");
    println!("  汇率乘积: (1/150) × 150.8 × 1 = 1.00533");
    println!("  毛利: 0.533%");
    println!("  费用: Raydium(0.25%) + Orca(0.01%) + AlphaQ(0.01%) = 0.27%");
    println!("  净利: 0.533% - 0.27% ≈ 0.26%");
    println!();
    
    let pools = vec![
        PoolPrice {
            pool_id: "raydium_sol_usdc".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "orca_sol_usdt".to_string(),
            dex_name: "Orca Whirlpool".to_string(),
            pair: "SOL/USDT".to_string(),
            price: 150.8,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_800_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "alphaq_usdc_usdt".to_string(),
            dex_name: "AlphaQ".to_string(),
            pair: "USDC/USDT".to_string(),
            price: 1.0,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 10_000_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    print_results(&cycles, "USDC→SOL→USDT→USDC", 0.2, 0.35);
    println!("\n====================================\n");
}

fn test_case_4hop_profitable() {
    println!("【案例3】4跳复杂路径（真实可盈利）");
    println!("----------------------------------------\n");
    
    println!("场景: 通过多个代币形成套利环");
    println!("  基准: SOL=150, RAY=2.0, JUP=1.2, USDC=1");
    println!("  Pool 1: SOL/USDC = 150.0 (Raydium)");
    println!("  Pool 2: SOL/RAY = 75.0 (Raydium) → 1 SOL = 75 RAY");
    println!("  Pool 3: RAY/JUP = 1.67 (Meteora) → 1 RAY = 1.67 JUP");
    println!("  Pool 4: JUP/USDC = 1.21 (Orca) → 1 JUP = 1.21 USDC");
    println!();
    
    println!("一致性检查:");
    println!("  SOL → RAY → JUP → USDC:");
    println!("  1 SOL = 75 RAY = 75×1.67 JUP = 125.25 JUP = 125.25×1.21 USDC = 151.55 USDC");
    println!("  直接 SOL → USDC: 150 USDC");
    println!("  差价: 151.55 - 150 = 1.55 USDC (1.03%)");
    println!("  扣费(0.25%×3 + 0.02% + 0.01%): 约0.88%");
    println!("  净利: 1.03% - 0.88% ≈ 0.15%");
    println!();
    
    let pools = vec![
        PoolPrice {
            pool_id: "raydium_sol_usdc".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "raydium_sol_ray".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/RAY".to_string(),
            price: 75.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 75_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "meteora_ray_jup".to_string(),
            dex_name: "Meteora DLMM".to_string(),
            pair: "RAY/JUP".to_string(),
            price: 1.67,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 16_700_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "orca_jup_usdc".to_string(),
            dex_name: "Orca Whirlpool".to_string(),
            pair: "JUP/USDC".to_string(),
            price: 1.21,
            base_reserve: 5_000_000_000_000,
            quote_reserve: 6_050_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    print_results(&cycles, "USDC→SOL→RAY→JUP→USDC", 0.1, 0.25);
    println!("\n====================================\n");
}

fn test_case_5hop() {
    println!("【案例4】5跳极限场景");
    println!("----------------------------------------\n");
    
    println!("场景: 通过5个交易对形成长链套利");
    println!("  需要更大的价差才能覆盖手续费（约1.25%）");
    println!();
    println!("  Pool 1: SOL/USDC = 150.0 (Raydium, 0.25%)");
    println!("  Pool 2: SOL/RAY = 75.0 (Raydium, 0.25%)");
    println!("  Pool 3: RAY/ORCA = 2.5 (Meteora, 0.02%)");
    println!("  Pool 4: ORCA/JUP = 3.2 (Orca, 0.01%)");
    println!("  Pool 5: JUP/USDC = 1.266 (Orca, 0.01%)");
    println!();
    
    println!("一致性检查:");
    println!("  1 SOL = 75 RAY = 187.5 ORCA = 600 JUP = 759.6 USDC");
    println!("  vs 直接: 150 USDC");
    println!("  差价: 609.6 USDC / 150 - 1 = 306%（这个不现实，仅用于测试算法能否找到5跳）");
    println!();
    
    let pools = vec![
        PoolPrice {
            pool_id: "p1".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p2".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/RAY".to_string(),
            price: 75.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 75_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p3".to_string(),
            dex_name: "Meteora DLMM".to_string(),
            pair: "RAY/ORCA".to_string(),
            price: 2.5,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 25_000_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p4".to_string(),
            dex_name: "Orca Whirlpool".to_string(),
            pair: "ORCA/JUP".to_string(),
            price: 3.2,
            base_reserve: 5_000_000_000_000,
            quote_reserve: 16_000_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p5".to_string(),
            dex_name: "Orca Whirlpool".to_string(),
            pair: "JUP/USDC".to_string(),
            price: 1.266,
            base_reserve: 5_000_000_000_000,
            quote_reserve: 6_330_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    print_results(&cycles, "任意5跳路径", 0.0, 10.0);
    println!("\n====================================\n");
}

fn test_case_unprofitable() {
    println!("【案例5】不盈利场景（负向测试）");
    println!("----------------------------------------\n");
    
    println!("场景: 价格一致，无套利机会");
    println!("  Pool 1: SOL/USDC = 150.0");
    println!("  Pool 2: SOL/USDT = 150.0");
    println!("  Pool 3: USDC/USDT = 1.0");
    println!();
    println!("预期: 不应找到任何循环（手续费导致亏损）");
    println!();
    
    let pools = vec![
        PoolPrice {
            pool_id: "p1".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "SOL/USDC".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p2".to_string(),
            dex_name: "Orca Whirlpool".to_string(),
            pair: "SOL/USDT".to_string(),
            price: 150.0,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_000_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p3".to_string(),
            dex_name: "AlphaQ".to_string(),
            pair: "USDC/USDT".to_string(),
            price: 1.0,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 10_000_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    if cycles.is_empty() {
        println!("✅ 结果: 正确！未找到循环");
        println!("   算法正确识别了无利可图的情况");
    } else {
        println!("❌ 错误: 找到了{}个循环，但不应该有！", cycles.len());
        for (idx, cycle) in cycles.iter().enumerate() {
            println!("\n  循环 #{}:", idx + 1);
            println!("    ROI: {:.4}%", cycle.roi_percent);
        }
    }
    
    println!("\n====================================\n");
}

fn print_results(cycles: &[solana_pool_cache::router::ArbitragePath], expected_path: &str, min_roi: f64, max_roi: f64) {
    println!("Bellman-Ford结果:");
    
    if cycles.is_empty() {
        println!("  ❌ 未找到循环");
        println!("  预期: 应该找到 {}", expected_path);
        return;
    }
    
    println!("  ✅ 找到 {} 个循环", cycles.len());
    
    for (idx, cycle) in cycles.iter().enumerate() {
        println!("\n  循环 #{}:", idx + 1);
        println!("    类型: {:?}", cycle.arb_type);
        println!("    跳数: {}", cycle.steps.len());
        println!("    净利润: {:.6} {}", cycle.net_profit, cycle.start_token);
        println!("    ROI: {:.4}%", cycle.roi_percent);
        
        // 验证ROI是否在合理范围
        if cycle.roi_percent < min_roi {
            println!("    ⚠️  ROI过低（< {:.2}%），可能被过滤", min_roi);
        } else if cycle.roi_percent > max_roi {
            println!("    ⚠️  ROI过高（> {:.2}%），可能有问题", max_roi);
        } else {
            println!("    ✅ ROI在预期范围内（{:.2}% - {:.2}%）", min_roi, max_roi);
        }
        
        println!("    路径:");
        for (i, step) in cycle.steps.iter().enumerate() {
            println!("      {}. {} → {} @ {:.4} (DEX: {})",
                i + 1,
                step.input_token,
                step.output_token,
                step.price,
                step.dex_name);
        }
    }
    
    println!("\n  预期路径: {}", expected_path);
}















