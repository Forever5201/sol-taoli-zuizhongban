// 简单的 WebSocket 连接测试
use tokio_tungstenite::connect_async;
use tokio::time::{timeout, Duration};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Simple WebSocket Test");
    println!("=====================\n");
    
    let url = "wss://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683";
    
    println!("🔌 Connecting to: {}", url);
    println!("⏳ Timeout: 30 seconds\n");
    
    match timeout(Duration::from_secs(30), connect_async(url)).await {
        Ok(Ok((ws_stream, response))) => {
            println!("✅ Connection successful!");
            println!("   Status: {:?}", response.status());
            println!("\n🎉 WebSocket works in Rust!");
        }
        Ok(Err(e)) => {
            eprintln!("❌ Connection error: {}", e);
        }
        Err(_) => {
            eprintln!("❌ Connection timeout after 30 seconds");
        }
    }
    
    Ok(())
}

