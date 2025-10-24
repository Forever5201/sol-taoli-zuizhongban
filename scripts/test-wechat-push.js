/**
 * 微信二次验证推送测试脚本
 * 
 * 用途：快速测试微信推送功能是否正常
 */

const https = require('https');

// 从配置读取 SendKey
const SEND_KEY = 'SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ';

console.log('🧪 开始测试微信二次验证推送功能...\n');

// 构建测试数据
const testData = {
  firstProfit: 4_500_000, // 0.0045 SOL
  secondProfit: 3_500_000, // 0.0035 SOL
  validationDelayMs: 150,
  bridgeToken: 'USDC',
  totalHops: 2,
  dexes: ['Raydium', 'Orca']
};

const firstProfitSOL = (testData.firstProfit / 1_000_000_000).toFixed(6);
const secondProfitSOL = (testData.secondProfit / 1_000_000_000).toFixed(6);
const profitChange = ((testData.secondProfit - testData.firstProfit) / testData.firstProfit * 100).toFixed(2);

// 构建 ServerChan 消息
const title = '✅ 机会通过二次验证（测试）';
const desp = `
发现高质量套利机会，已通过二次验证，利润 **${secondProfitSOL} SOL**

---

### 🎯 验证状态
✅ 通过验证（${testData.validationDelayMs}ms 后仍存活）

---

### 利润对比
- 💰 **首次利润**: ${firstProfitSOL} SOL
- 💎 **验证利润**: ${secondProfitSOL} SOL  
- 📊 **利润变化**: ${profitChange}%

---

### ⏱️ 机会存活时间
**${testData.validationDelayMs}ms**

---

### 🔀 交易路径
SOL → ${testData.bridgeToken} → SOL（${testData.totalHops}跳）

---

### 🏦 使用DEX
${testData.dexes.join(' + ')}

---

**📌 这是测试消息，说明微信推送配置正常！**
`;

// 发送请求
const url = `https://sctapi.ftqq.com/${SEND_KEY}.send`;
const postData = new URLSearchParams({
  title: title,
  desp: desp
}).toString();

console.log('📤 发送测试推送到微信...\n');
console.log('测试数据:');
console.log(`  - 首次利润: ${firstProfitSOL} SOL`);
console.log(`  - 验证利润: ${secondProfitSOL} SOL`);
console.log(`  - 机会存活: ${testData.validationDelayMs}ms`);
console.log(`  - 桥接次数: ${testData.totalHops}跳`);
console.log(`  - 使用DEX: ${testData.dexes.join(' + ')}\n`);

const urlObj = new URL(url);
const options = {
  hostname: urlObj.hostname,
  port: 443,
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.code === 0) {
        console.log('✅ 测试成功！微信推送已发送');
        console.log('📱 请检查您的微信"服务通知"查看消息\n');
        console.log('🎉 如果收到消息，说明配置正确！');
        console.log('   现在可以运行机器人，通过二次验证的机会会自动推送到微信。');
      } else {
        console.log('❌ 测试失败：', response.message || '未知错误');
        console.log('完整响应:', response);
      }
    } catch (error) {
      console.log('❌ 解析响应失败:', error.message);
      console.log('原始响应:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 发送请求失败:', error.message);
  console.error('可能的原因：');
  console.error('  1. 网络连接问题');
  console.error('  2. SendKey 配置错误');
  console.error('  3. ServerChan 服务异常');
});

req.write(postData);
req.end();

