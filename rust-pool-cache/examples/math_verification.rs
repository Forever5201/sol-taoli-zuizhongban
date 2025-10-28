/*!
 * 数学验证 - 手动计算的已知套利案例
 * 
 * 用于验证Bellman-Ford算法的数学正确性
 */

use solana_pool_cache::price_cache::{PoolPrice, PriceCache};
use solana_pool_cache::router_bellman_ford::BellmanFordScanner;
use std::sync::Arc;
use std::time::Instant;

fn main() {
    println!("====================================");
    println!("数学验证 - Bellman-Ford算法");
    println!("====================================\n");
    
    // 测试案例1: 简单2跳套利
    test_case_1();
    
    // 测试案例2: 三角套利
    test_case_2();
    
    // 测试案例3: 4跳复杂路径
    test_case_3();
}

fn test_case_1() {
    println!("【案例1】简单2跳直接套利");
    println!("----------------------------------------\n");
    
    println!("池子配置:");
    println!("  Pool A (Raydium): SOL/USDC = 150.0");
    println!("  Pool B (Lifinity): SOL/USDC = 151.0");
    println!();
    
    println!("数学预期:");
    println!("  汇率: 1 USDC → 1/150 SOL → 151 USDC");
    println!("  乘积: (1/150) × 151 = 1.00667");
    println!("  利润: 0.667%");
    let rate_a: f64 = 1.0 / 150.0;
    let rate_b: f64 = 151.0;
    let product = rate_a * rate_b;
    println!("  验证乘积: {}", product);
    println!();
    
    println!("  负对数验证:");
    println!("    Weight A: -ln({}) = {}", rate_a, -rate_a.ln());
    println!("    Weight B: -ln({}) = {}", rate_b, -rate_b.ln());
    println!("    总权重: {} < 0 ✓", -rate_a.ln() + (-rate_b.ln()));
    println!();
    
    // 创建测试池子
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
    
    // 运行Bellman-Ford
    let scanner = BellmanFordScanner::new(6, 0.0001);  // 极低阈值确保找到
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    println!("Bellman-Ford结果:");
    if cycles.is_empty() {
        println!("  ❌ 未找到循环！");
    } else {
        println!("  ✅ 找到 {} 个循环", cycles.len());
        for (idx, cycle) in cycles.iter().enumerate() {
            println!("\n  循环 #{}:", idx + 1);
            println!("    类型: {:?}", cycle.arb_type);
            println!("    跳数: {}", cycle.steps.len());
            println!("    净利润: {:.6} USDC", cycle.net_profit);
            println!("    ROI: {:.4}%", cycle.roi_percent);
            println!("    路径:");
            for (i, step) in cycle.steps.iter().enumerate() {
                println!("      {}. {} → {} @ {:.4}", 
                    i+1, step.input_token, step.output_token, step.price);
            }
        }
    }
    
    println!("\n  期望: 应该找到USDC→SOL→USDC的循环，ROI约0.17%");
    println!("\n====================================\n");
}

fn test_case_2() {
    println!("【案例2】三角套利");
    println!("----------------------------------------\n");
    
    println!("池子配置:");
    println!("  Pool 1: SOL/USDC = 150.0 (Raydium)");
    println!("  Pool 2: SOL/USDT = 150.5 (Orca)");
    println!("  Pool 3: USDC/USDT = 1.001 (SolFi V2)");
    println!();
    
    println!("路径: USDC → SOL → USDT → USDC");
    let r1: f64 = 1.0 / 150.0;  // USDC → SOL
    let r2: f64 = 150.5;         // SOL → USDT  
    let r3: f64 = 1.0 / 1.001;   // USDT → USDC
    let product = r1 * r2 * r3;
    println!("汇率乘积: {} × {} × {} = {}", r1, r2, r3, product);
    println!("利润: {:.4}%", (product - 1.0) * 100.0);
    println!();
    
    // 创建池子
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
            price: 150.5,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 150_500_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "solfi_usdc_usdt".to_string(),
            dex_name: "SolFi V2".to_string(),
            pair: "USDC/USDT".to_string(),
            price: 1.001,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 10_010_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    println!("Bellman-Ford结果:");
    if cycles.is_empty() {
        println!("  ❌ 未找到循环！");
    } else {
        println!("  ✅ 找到 {} 个循环", cycles.len());
        for cycle in &cycles {
            if cycle.steps.len() == 3 {
                println!("\n  三角循环:");
                println!("    净利润: {:.6} USDC", cycle.net_profit);
                println!("    ROI: {:.4}%", cycle.roi_percent);
                println!("    路径:");
                for (i, step) in cycle.steps.iter().enumerate() {
                    println!("      {}. {} → {}", i+1, step.input_token, step.output_token);
                }
            }
        }
    }
    
    println!("\n  期望: 应该找到USDC→SOL→USDT→USDC，扣费后ROI约0.1%");
    println!("\n====================================\n");
}

fn test_case_3() {
    println!("【案例3】4跳复杂路径");
    println!("----------------------------------------\n");
    
    println!("池子配置:");
    println!("  Pool 1: SOL/USDC = 150.0");
    println!("  Pool 2: SOL/RAY = 22.5");  
    println!("  Pool 3: RAY/USDT = 2.22");
    println!("  Pool 4: USDC/USDT = 1.001");
    println!();
    
    println!("路径: USDC → SOL → RAY → USDT → USDC");
    println!("这个需要Bellman-Ford才能发现（4跳）");
    println!();
    
    // 创建池子
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
            price: 22.5,
            base_reserve: 1_000_000_000_000_000,
            quote_reserve: 22_500_000_000_000,
            base_decimals: 9,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p3".to_string(),
            dex_name: "Raydium AMM V4".to_string(),
            pair: "RAY/USDT".to_string(),
            price: 2.22,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 22_200_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
        PoolPrice {
            pool_id: "p4".to_string(),
            dex_name: "SolFi V2".to_string(),
            pair: "USDC/USDT".to_string(),
            price: 1.001,
            base_reserve: 10_000_000_000_000,
            quote_reserve: 10_010_000_000_000,
            base_decimals: 6,
            quote_decimals: 6,
            last_update: Instant::now(),
        },
    ];
    
    let scanner = BellmanFordScanner::new(6, 0.0001);
    let cycles = scanner.find_all_cycles(&pools, 1000.0);
    
    println!("Bellman-Ford结果:");
    if cycles.is_empty() {
        println!("  ❌ 未找到循环！");
    } else {
        println!("  ✅ 找到 {} 个循环", cycles.len());
        
        // 查找4跳循环
        let four_hop = cycles.iter().find(|c| c.steps.len() == 4);
        if let Some(cycle) = four_hop {
            println!("\n  4跳循环:");
            println!("    净利润: {:.6} USDC", cycle.net_profit);
            println!("    ROI: {:.4}%", cycle.roi_percent);
            println!("    路径:");
            for (i, step) in cycle.steps.iter().enumerate() {
                println!("      {}. {} → {} @ {:.4}", 
                    i+1, step.input_token, step.output_token, step.price);
            }
        } else {
            println!("\n  ⚠️ 未找到4跳循环（可能路径不盈利或被过滤）");
        }
        
        println!("\n  所有找到的循环:");
        for (idx, cycle) in cycles.iter().enumerate() {
            println!("    {}. {}跳 - ROI: {:.4}%", idx+1, cycle.steps.len(), cycle.roi_percent);
        }
    }
    
    println!("\n  期望: 应该找到至少一个包含4跳的循环");
    println!("\n====================================\n");
}






