/**
 * Server酱测试脚本
 * 
 * 使用方法：
 * node test-serverchan.js
 */

const axios = require('axios');

// 您的 SendKey
const SEND_KEY = 'SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ';
const API_URL = 'https://sctapi.ftqq.com';

async function testServerChan() {
  console.log('🧪 开始测试 Server酱连接...\n');
  console.log(`📱 SendKey: ${SEND_KEY}`);
  console.log(`🌐 API URL: ${API_URL}\n`);

  try {
    console.log('📤 发送测试消息...');
    
    const response = await axios.post(
      `${API_URL}/${SEND_KEY}.send`,
      {
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
      },
      { timeout: 10000 }
    );

    console.log('\n✅ 测试成功！');
    console.log(`📊 响应状态: ${response.status}`);
    console.log(`📦 响应数据:`, JSON.stringify(response.data, null, 2));

    if (response.data.code === 0) {
      console.log('\n🎉 Server酱配置成功！');
      console.log('📱 请查看您的微信"服务通知"，应该已经收到测试消息了！');
      console.log('\n💡 提示：');
      console.log('   - 如果没收到，请检查微信是否允许"服务通知"');
      console.log('   - 首次使用可能有 1-2 分钟延迟');
      console.log('   - 确保 SendKey 正确无误');
    } else {
      console.log('\n❌ Server酱返回错误：');
      console.log(`   错误代码: ${response.data.code}`);
      console.log(`   错误信息: ${response.data.message}`);
    }

  } catch (error) {
    console.log('\n❌ 测试失败！');
    
    if (error.response) {
      console.log(`📊 HTTP 状态: ${error.response.status}`);
      console.log(`📦 响应数据:`, error.response.data);
    } else if (error.request) {
      console.log('❌ 网络错误：无法连接到 Server酱服务器');
      console.log('💡 可能的原因：');
      console.log('   - 网络连接问题');
      console.log('   - 防火墙拦截');
      console.log('   - API 服务暂时不可用');
    } else {
      console.log('❌ 错误：', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
}

// 运行测试
testServerChan().catch(console.error);

