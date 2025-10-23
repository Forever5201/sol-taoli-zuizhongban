/**
 * 测试微信推送功能
 */

import axios from 'axios';

const SENDKEY = 'SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ';  // 之前配置文件中的SendKey

async function testWeChatPush() {
  console.log('🧪 开始测试微信推送功能...\n');

  // 模拟二次验证通过的数据
  const testData = {
    title: '✅ 机会通过二次验证',
    desp: `发现高质量套利机会，已通过二次验证，利润 **0.003215 SOL**

---

🎯 验证状态: ✅ 通过二次验证

---

**💰 首次利润**: 0.003500 SOL (0.35%)

**💎 验证利润**: 0.003215 SOL (0.32%)

**📊 利润变化**: -8.14%



**⏱️ 验证延迟**: 245ms

**🔄 首次查询**: 385ms (198+187)

**🔍 验证查询**: 317ms (165+152)



**🔀 交易路径**: SOL → USDC → SOL

---

**时间**: ${new Date().toLocaleString('zh-CN')}

**级别**: 🟡 中`
  };

  try {
    console.log('📤 发送测试推送到ServerChan...');
    console.log(`📍 SendKey: ${SENDKEY.slice(0, 10)}...`);
    console.log(`📝 标题: ${testData.title}\n`);

    const response = await axios.post(
      `https://sctapi.ftqq.com/${SENDKEY}.send`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ ServerChan API响应：');
    console.log(`   Code: ${response.data.code}`);
    console.log(`   Message: ${response.data.message}`);
    console.log(`   PushID: ${response.data.data?.pushid || 'N/A'}`);

    if (response.data.code === 0) {
      console.log('\n🎉 测试成功！请检查您的微信"服务通知"，应该会收到一条推送消息。');
      console.log('\n📱 推送内容预览：');
      console.log('   标题: ✅ 机会通过二次验证');
      console.log('   内容: 包含利润对比、延迟分析、交易路径等详细信息');
      return true;
    } else {
      console.log(`\n❌ 测试失败：${response.data.message}`);
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ 测试出错：', error.message);
    if (error.response) {
      console.error('   API响应:', error.response.data);
    }
    return false;
  }
}

// 运行测试
testWeChatPush().then((success) => {
  process.exit(success ? 0 : 1);
});

