// 精确诊断 Tokio 运行时问题
use tokio::time::{timeout, sleep, Duration};
use tokio_tungstenite::connect_async;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Tokio Runtime Diagnostics ===\n");
    
    // 测试 1: 基本的 spawn + connect
    println!("Test 1: Spawn task with WebSocket connection");
    let handle1 = tokio::spawn(async {
        println!("  [Task 1] Started");
        let url = "wss://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683";
        
        println!("  [Task 1] Attempting to connect...");
        match timeout(Duration::from_secs(10), connect_async(url)).await {
            Ok(Ok(_)) => println!("  [Task 1] ✅ Connected!"),
            Ok(Err(e)) => println!("  [Task 1] ❌ Connection error: {}", e),
            Err(_) => println!("  [Task 1] ⏰ Timeout!"),
        }
        println!("  [Task 1] Finished");
    });
    
    // 在主任务中 sleep（模拟主程序行为）
    println!("Main: Sleeping 1 second...");
    sleep(Duration::from_secs(1)).await;
    println!("Main: Sleep finished");
    
    // 等待任务完成
    println!("Main: Waiting for task 1...");
    let _ = handle1.await;
    println!("Main: Task 1 completed\n");
    
    // 测试 2: 多个并发任务（模拟主程序）
    println!("Test 2: Multiple concurrent tasks");
    
    // API Server 模拟（占用端口）
    let api_handle = tokio::spawn(async {
        println!("  [API Task] Started");
        sleep(Duration::from_secs(100)).await; // 模拟长期运行
        println!("  [API Task] Finished");
    });
    
    sleep(Duration::from_millis(100)).await;
    
    // WebSocket 任务
    let ws_handle = tokio::spawn(async {
        println!("  [WS Task] Started");
        let url = "wss://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683";
        
        println!("  [WS Task] Attempting to connect...");
        match timeout(Duration::from_secs(10), connect_async(url)).await {
            Ok(Ok(_)) => println!("  [WS Task] ✅ Connected!"),
            Ok(Err(e)) => println!("  [WS Task] ❌ Connection error: {}", e),
            Err(_) => println!("  [WS Task] ⏰ Timeout!"),
        }
        println!("  [WS Task] Finished");
    });
    
    // 主任务 sleep
    println!("Main: Sleeping 2 seconds...");
    sleep(Duration::from_secs(2)).await;
    println!("Main: Sleep finished");
    
    // Metrics 任务
    let metrics_handle = tokio::spawn(async {
        println!("  [Metrics Task] Started");
        for i in 0..3 {
            sleep(Duration::from_secs(1)).await;
            println!("  [Metrics Task] Tick {}", i);
        }
        println!("  [Metrics Task] Finished");
    });
    
    println!("Main: All tasks spawned, waiting...\n");
    
    // 使用 select 等待（模拟主程序）
    tokio::select! {
        _ = ws_handle => println!("WS task finished first"),
        _ = metrics_handle => println!("Metrics task finished first"),
        _ = tokio::time::sleep(Duration::from_secs(15)) => {
            println!("⏰ Timeout waiting for tasks!");
        }
    }
    
    // 清理 API task
    api_handle.abort();
    
    println!("\n=== Diagnostics Complete ===");
    Ok(())
}










