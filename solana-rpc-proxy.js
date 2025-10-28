/**
 * Solana RPC 代理服务器
 * 
 * 在 Windows 上监听 localhost:8899
 * 通过 Clash 代理转发请求到 Helius RPC
 * 
 * 用途：让 jupiter-swap-api 无需代理即可访问 Solana RPC
 */

const http = require('http');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=d261c4a1-fffe-4263-b0ac-a667c05b5683';
const PROXY_URL = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
const LOCAL_PORT = 8899;

// 创建代理 agent
const agent = new HttpsProxyAgent(PROXY_URL);

// 创建本地服务器
const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // 读取请求 body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    // 构造代理请求
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      agent: agent, // 使用 Clash 代理
    };

    // 转发请求到 Helius
    const proxyReq = https.request(HELIUS_RPC, options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('❌ Proxy request failed:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Bad Gateway', 
        message: err.message 
      }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(LOCAL_PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Solana RPC Proxy Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Local:  http://localhost:${LOCAL_PORT}`);
  console.log(`📡 WSL:    http://$(ip route show | grep -i default | awk '{ print $3}'):${LOCAL_PORT}`);
  console.log(`🔗 Target: ${HELIUS_RPC.split('?')[0]}...`);
  console.log(`🌐 Proxy:  ${PROXY_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Ready to proxy Solana RPC requests!\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down proxy server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});


