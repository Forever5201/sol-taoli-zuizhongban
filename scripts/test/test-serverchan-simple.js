/**
 * Server酱测试脚本（无需额外依赖）
 * 
 * 使用 Node.js 内置的 https 模块
 * 使用方法：node test-serverchan-simple.js
 */

const https = require('https');

// 您的 SendKey
const SEND_KEY = 'SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ';

console.log('🧪 开始测试 Server酱连接...\n');
console.log(`📱 SendKey: ${SEND_KEY}`);
console.log(`🌐 API URL: https://sctapi.ftqq.com\n`);

// 构建请求数据
const postData = JSON.stringify({
  title: '🎉 Solana 套利机器人测试',
  desp: `## 测试通知

这是一条测试消息，如果您在微信收到了这条消息，说明 Server酱配置成功！

---

**配置信息**:
- SendKey: ${SEND_KEY.substring(0, 10)}...
- 测试时间: ${new Date().toLocaleString('zh-CN')}

---

### 接下来您将收到以下类型的通知：

1. **💰 利润通知** - 每次套利成功
2. **❌ 错误告警** - 出现异常时
3. **🚨 熔断通知** - 触发风险保护
4. **📊 性能统计** - 定期运行报告

---

🎯 **下一步**: 启动套利机器人，开始实时监控！
`,
});

// 配置请求选项
const options = {
  hostname: 'sctapi.ftqq.com',
  path: `/${SEND_KEY}.send`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
  timeout: 10000,
};

console.log('📤 发送测试消息...\n');

// 发送请求
const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('✅ 请求完成！\n');
    console.log(`📊 HTTP 状态码: ${res.statusCode}\n`);

    try {
      const response = JSON.parse(data);
      console.log('📦 响应数据:');
      console.log(JSON.stringify(response, null, 2));
      console.log('');

      if (response.code === 0) {
        console.log('🎉 Server酱配置成功！');
        console.log('📱 请查看您的微信"服务通知"，应该已经收到测试消息了！');
        console.log('');
        console.log('💡 提示：');
        console.log('   - 如果没收到，请检查微信是否允许"服务通知"');
        console.log('   - 首次使用可能有 1-2 分钟延迟');
        console.log('   - 确保 SendKey 正确无误');
      } else {
        console.log('❌ Server酱返回错误：');
        console.log(`   错误代码: ${response.code}`);
        console.log(`   错误信息: ${response.message}`);
      }
    } catch (error) {
      console.log('❌ 解析响应数据失败：', error.message);
      console.log('原始响应：', data);
    }

    console.log('\n' + '='.repeat(60));
  });
});

// 错误处理
req.on('error', (error) => {
  console.log('\n❌ 测试失败！');
  console.log('错误信息：', error.message);
  console.log('');
  console.log('💡 可能的原因：');
  console.log('   - 网络连接问题');
  console.log('   - 防火墙拦截');
  console.log('   - API 服务暂时不可用');
  console.log('   - SendKey 可能不正确');
  console.log('\n' + '='.repeat(60));
});

req.on('timeout', () => {
  console.log('\n❌ 请求超时！');
  console.log('请检查网络连接');
  req.destroy();
});

// 发送数据
req.write(postData);
req.end();

