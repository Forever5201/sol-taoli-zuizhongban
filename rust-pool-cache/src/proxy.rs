use anyhow::{anyhow, Context, Result};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::{timeout, Duration};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};
use url::Url;

/// Type alias for WebSocket stream
pub type WsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

/// Connect to a WebSocket endpoint via an HTTP CONNECT proxy
pub async fn connect_via_proxy(
    proxy_host: &str,
    proxy_port: u16,
    target_url: &str,
) -> Result<WsStream> {
    // Parse the target URL
    let url = Url::parse(target_url)
        .context("Failed to parse WebSocket URL")?;
    
    let target_host = url.host_str()
        .ok_or_else(|| anyhow!("Missing host in URL"))?;
    
    let target_port = url.port_or_known_default()
        .ok_or_else(|| anyhow!("Cannot determine port"))?;
    
    println!("🔌 Connecting via proxy {}:{} to {}:{}...", 
             proxy_host, proxy_port, target_host, target_port);
    
    // Step 1: Connect to the proxy server
    let proxy_addr = format!("{}:{}", proxy_host, proxy_port);
    let mut proxy_stream = timeout(
        Duration::from_secs(5),
        TcpStream::connect(&proxy_addr)
    )
    .await
    .context("Timeout connecting to proxy")?
    .context(format!("Failed to connect to proxy at {}", proxy_addr))?;
    
    println!("✅ Connected to proxy server");
    
    // Step 2: Send HTTP CONNECT request
    let connect_request = format!(
        "CONNECT {}:{} HTTP/1.1\r\n\
         Host: {}:{}\r\n\
         Proxy-Connection: Keep-Alive\r\n\
         Connection: Keep-Alive\r\n\r\n",
        target_host, target_port, target_host, target_port
    );
    
    proxy_stream.write_all(connect_request.as_bytes())
        .await
        .context("Failed to send CONNECT request")?;
    
    println!("📤 Sent CONNECT request to proxy");
    
    // Step 3: Read and parse proxy response
    let mut buffer = vec![0u8; 4096];
    let n = timeout(
        Duration::from_secs(5),
        proxy_stream.read(&mut buffer)
    )
    .await
    .context("Timeout reading proxy response")?
    .context("Failed to read proxy response")?;
    
    if n == 0 {
        return Err(anyhow!("Proxy closed connection"));
    }
    
    let response = String::from_utf8_lossy(&buffer[..n]);
    println!("📥 Received proxy response: {}", 
             response.lines().next().unwrap_or("(empty)"));
    
    // Check for 200 Connection Established
    if !response.starts_with("HTTP/1.1 200") && !response.starts_with("HTTP/1.0 200") {
        return Err(anyhow!("Proxy connection failed: {}", 
                          response.lines().next().unwrap_or("Unknown error")));
    }
    
    println!("✅ Proxy tunnel established");
    
    // Step 4: Upgrade to TLS and WebSocket
    // Wrap the proxy_stream in MaybeTlsStream and let tokio-tungstenite handle TLS
    println!("🔒 Establishing WebSocket connection through proxy...");
    
    // Create a native-tls connector
    let connector = tokio_native_tls::TlsConnector::from(
        native_tls::TlsConnector::builder()
            .danger_accept_invalid_certs(false)
            .build()
            .context("Failed to create TLS connector")?
    );
    
    // Perform TLS handshake
    let tls_stream = connector
        .connect(target_host, proxy_stream)
        .await
        .context("Failed to perform TLS handshake")?;
    
    println!("✅ TLS handshake complete");
    
    // Wrap in MaybeTlsStream::NativeTls
    let maybe_tls_stream = MaybeTlsStream::NativeTls(tls_stream);
    
    // Now create WebSocket connection
    let (ws_stream, _) = tokio_tungstenite::client_async(target_url, maybe_tls_stream)
        .await
        .context("Failed to establish WebSocket connection")?;
    
    println!("✅ WebSocket connection established");
    
    Ok(ws_stream)
}

/// Connect directly without proxy
pub async fn connect_direct(
    target_url: &str,
) -> Result<WsStream> {
    use tokio::time::{timeout, Duration};
    
    println!("🔌 Connecting directly to {}...", target_url);
    println!("⏳ Connection timeout: 30 seconds");
    
    println!("DEBUG: Creating connect_async future...");
    let connect_future = tokio_tungstenite::connect_async(target_url);
    
    println!("DEBUG: Calling timeout().await...");
    let result = match timeout(Duration::from_secs(30), connect_future).await {
        Ok(r) => {
            println!("DEBUG: timeout() returned Ok");
            r
        }
        Err(_) => {
            println!("DEBUG: timeout() returned Err (timeout!)");
            return Err(anyhow::anyhow!("Connection timeout after 30 seconds"));
        }
    };
    
    println!("DEBUG: Checking connection result...");
    let (ws_stream, response) = result
        .context("Failed to connect to WebSocket")?;
    
    println!("✅ WebSocket connected! Status: {:?}", response.status());
    
    Ok(ws_stream)
}

