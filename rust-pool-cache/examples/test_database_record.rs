/*!
 * 测试数据库记录功能
 * 
 * 创建测试套利机会并记录到数据库
 */

use solana_pool_cache::database::{DatabaseManager, DatabaseConfig};
use solana_pool_cache::router::{ArbitragePath, ArbitrageType, RouteStep};
use std::time::Instant;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("====================================");
    println!("测试数据库记录功能");
    println!("====================================\n");
    
    // 初始化数据库
    println!("1. 初始化数据库连接...");
    let mut db = DatabaseManager::new(DatabaseConfig {
        enabled: true,
        url: "postgresql://postgres:Yuan971035088@localhost:5432/postgres".to_string(),
        record_opportunities: true,
        record_pool_updates: false,
        record_performance: true,
    }).await?;
    
    db.set_subscription_start();
    println!("✅ 数据库初始化成功\n");
    
    // 创建测试套利路径
    println!("2. 创建测试套利路径...");
    let test_path = ArbitragePath {
        arb_type: ArbitrageType::Triangle,
        steps: vec![
            RouteStep {
                pool_id: "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2".to_string(),
                dex_name: "Raydium AMM V4".to_string(),
                input_token: "USDC".to_string(),
                output_token: "SOL".to_string(),
                price: 0.00666667,
                liquidity_base: 1_000_000_000_000_000,
                liquidity_quote: 150_000_000_000_000,
                expected_input: 1000.0,
                expected_output: 6.65,
            },
            RouteStep {
                pool_id: "7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX".to_string(),
                dex_name: "Orca Whirlpool".to_string(),
                input_token: "SOL".to_string(),
                output_token: "USDT".to_string(),
                price: 150.8,
                liquidity_base: 1_000_000_000_000_000,
                liquidity_quote: 150_800_000_000_000,
                expected_input: 6.65,
                expected_output: 1002.32,
            },
            RouteStep {
                pool_id: "Pi9nzTjPxD8DsRfRBGfKYzmefJoJM8TcXu2jyaQjSHm".to_string(),
                dex_name: "AlphaQ".to_string(),
                input_token: "USDT".to_string(),
                output_token: "USDC".to_string(),
                price: 1.0,
                liquidity_base: 10_000_000_000_000,
                liquidity_quote: 10_000_000_000_000,
                expected_input: 1002.32,
                expected_output: 1002.62,
            },
        ],
        start_token: "USDC".to_string(),
        end_token: "USDC".to_string(),
        input_amount: 1000.0,
        output_amount: 1002.62,
        gross_profit: 2.62,
        estimated_fees: 0.27,
        net_profit: 2.35,
        roi_percent: 0.235,
        discovered_at: Instant::now(),
    };
    
    println!("✅ 测试路径创建成功");
    println!("   类型: {:?}", test_path.arb_type);
    println!("   ROI: {:.4}%", test_path.roi_percent);
    println!("   路径: USDC→SOL→USDT→USDC");
    println!("   跳数: {}\n", test_path.steps.len());
    
    // 记录到数据库
    println!("3. 记录到数据库...");
    let opp_id = db.record_opportunity(
        &test_path,
        "Complete",
        0.01,
    ).await?;
    
    println!("✅ 记录成功！机会ID: {}\n", opp_id);
    
    // 验证记录
    println!("4. 验证记录...");
    println!("   使用以下命令查询:");
    println!("   cargo run --example query_opportunities -- --by-id {}", opp_id);
    println!("\n====================================");
    println!("✅ 测试完成！数据库记录功能正常工作。");
    println!("====================================\n");
    
    Ok(())
}







