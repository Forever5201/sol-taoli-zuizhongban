/**
 * 测试Bot监控服务集成
 */

import { MonitoringService } from '@solana-arb-bot/core';

const SENDKEY = 'SCT299918Tjm2hNLuwKRB9DqqHaiDvj3kJ';

async function testBotMonitoring() {
  console.log('🧪 测试Bot监控服务集成...\n');

  // 初始化监控服务（模拟Bot的配置）
  const monitoring = new MonitoringService({
    enabled: true,
    serverChan: {
      sendKey: SENDKEY,
      enabled: true,
    },
    alertOnOpportunityValidated: true,
    minValidatedProfitForAlert: 2_000_000,  // 0.002 SOL
    validatedAlertRateLimitMs: 0,
  });

  console.log('✅ 监控服务已初始化');
  console.log(`   ServerChan: ${monitoring['serverChan'] ? '已启用' : '未启用'}`);
  console.log(`   推送阈值: 0.002 SOL\n`);

  // 模拟二次验证通过的机会数据
  const mockOpportunity = {
    inputMint: 'So11111111111111111111111111111111111111112',
    bridgeToken: 'USDC',
    // 第一次数据
    firstProfit: 3_500_000,  // 0.0035 SOL
    firstRoi: 0.0035,
    firstOutboundMs: 198,
    firstReturnMs: 187,
    // 第二次数据
    secondProfit: 3_215_000,  // 0.003215 SOL
    secondRoi: 0.003215,
    secondOutboundMs: 165,
    secondReturnMs: 152,
    // 验证延迟
    validationDelayMs: 245,
  };

  console.log('📊 模拟机会数据：');
  console.log(`   首次利润: ${(mockOpportunity.firstProfit / 1e9).toFixed(6)} SOL`);
  console.log(`   验证利润: ${(mockOpportunity.secondProfit / 1e9).toFixed(6)} SOL`);
  console.log(`   验证延迟: ${mockOpportunity.validationDelayMs}ms\n`);

  try {
    console.log('📤 调用 alertOpportunityValidated()...');
    
    const result = await monitoring.alertOpportunityValidated(mockOpportunity);

    if (result) {
      console.log('\n✅ 推送成功！');
      console.log('\n📱 请检查您的微信"服务通知"，应该会收到一条推送，包含：');
      console.log('   ✓ 首次利润 vs 验证利润对比');
      console.log('   ✓ 利润变化百分比');
      console.log('   ✓ 首次查询和验证查询的延迟');
      console.log('   ✓ 交易路径（SOL → USDC → SOL）');
      console.log('\n🎯 结论：二次验证推送功能正常工作！');
      return true;
    } else {
      console.log('\n⚠️ 推送被跳过（可能是频率限制或利润低于阈值）');
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ 推送失败：', error.message);
    return false;
  }
}

// 运行测试
testBotMonitoring().then((success) => {
  process.exit(success ? 0 : 1);
});

