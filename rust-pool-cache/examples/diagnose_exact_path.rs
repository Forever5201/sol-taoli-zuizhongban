// 精确模拟主程序的代码路径
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::Mutex;

// 模拟 WebSocketClient 的结构
struct MockWebSocketClient {
    url: String,
    data: Arc<Mutex<HashMap<String, String>>>,
}

impl MockWebSocketClient {
    fn new(url: String) -> Self {
        Self {
            url,
            data: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    
    // 模拟 run() 方法
    async fn run(&self) -> anyhow::Result<()> {
        println!("  [WS Client] run() started");
        
        loop {
            match self.connect_and_process().await {
                Ok(_) => {
                    println!("  [WS Client] Connection closed normally");
                }
                Err(e) => {
                    eprintln!("  [WS Client] Error: {}", e);
                }
            }
            
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        }
    }
    
    // 模拟 connect_and_process() 方法
    async fn connect_and_process(&self) -> anyhow::Result<()> {
        println!("  [WS Client] connect_and_process() started");
        println!("  [WS Client] Connecting to: {}", self.url);
        
        // 调用 proxy::connect_direct 的模拟
        let _ws_stream = self.connect_direct().await?;
        
        println!("  [WS Client] ✅ Connected!");
        
        // 模拟消息处理循环
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        
        Ok(())
    }
    
    // 模拟 proxy::connect_direct()
    async fn connect_direct(&self) -> anyhow::Result<()> {
        use tokio::time::{timeout, Duration};
        
        println!("  [connect_direct] Starting...");
        println!("  [connect_direct] URL: {}", self.url);
        println!("  [connect_direct] Timeout: 10 seconds");
        
        let url = self.url.clone();
        
        // 这里是关键！模拟实际的 connect_async 调用
        let connect_future = tokio_tungstenite::connect_async(&url);
        
        println!("  [connect_direct] Future created, calling timeout...");
        
        let result = timeout(Duration::from_secs(10), connect_future)
            .await
            .map_err(|_| anyhow::anyhow!("Connection timeout"))?;
        
        println!("  [connect_direct] timeout returned!");
        
        result.map_err(|e| anyhow::anyhow!("Connection error: {}", e))?;
        
        println!("  [connect_direct] ✅ Success!");
        
        Ok(())
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("=== Exact Path Diagnostics ===\n");
    
    let url = "wss://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683";
    
    println!("Creating WebSocket client...");
    let ws_client = MockWebSocketClient::new(url.to_string());
    
    println!("Spawning WebSocket task...");
    let ws_handle = tokio::spawn(async move {
        if let Err(e) = ws_client.run().await {
            eprintln!("❌ WS task error: {}", e);
        }
    });
    
    println!("Main: Sleeping 1 second...");
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    
    println!("Main: Spawning other tasks...");
    
    let metrics_handle = tokio::spawn(async {
        for i in 0..3 {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            println!("  [Metrics] Tick {}", i);
        }
    });
    
    println!("Main: Waiting for tasks...\n");
    
    tokio::select! {
        _ = ws_handle => println!("WS task finished"),
        _ = metrics_handle => println!("Metrics finished"),
        _ = tokio::time::sleep(tokio::time::Duration::from_secs(15)) => {
            println!("⏰ Timeout!");
        }
    }
    
    println!("\n=== Complete ===");
    Ok(())
}










