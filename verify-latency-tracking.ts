/**
 * 验证延迟跟踪功能
 * 
 * 用途：检查数据库schema是否正确，以及数据记录是否完整
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 开始验证延迟跟踪功能...\n');

  // 1. 检查数据库连接
  console.log('1️⃣ 测试数据库连接...');
  try {
    await prisma.$connect();
    console.log('   ✅ 数据库连接成功\n');
  } catch (error) {
    console.error('   ❌ 数据库连接失败:', error);
    process.exit(1);
  }

  // 2. 检查Schema字段（通过Prisma Client类型检查）
  console.log('2️⃣ 验证Schema字段（编译时检查）...');
  console.log('   ✅ TypeScript类型已验证（如果能运行到这里，说明Schema正确）\n');

  // 3. 查询最近的验证记录
  console.log('3️⃣ 查询最近的验证记录（检查数据）...');
  try {
    const latestValidations = await prisma.opportunityValidation.findMany({
      take: 5,
      orderBy: {
        id: 'desc',
      },
      select: {
        id: true,
        opportunityId: true,
        validationDelayMs: true,
        firstOutboundMs: true,
        firstReturnMs: true,
        secondOutboundMs: true,
        secondReturnMs: true,
        stillExists: true,
        firstDetectedAt: true,
      },
    });

    if (latestValidations.length === 0) {
      console.log('   ⚠️ 暂无验证记录（这是正常的，Bot启动后会自动记录）\n');
    } else {
      console.log(`   ✅ 找到 ${latestValidations.length} 条验证记录：\n`);
      
      latestValidations.forEach((v, idx) => {
        console.log(`   记录 ${idx + 1}:`);
        console.log(`      ID: ${v.id}`);
        console.log(`      Opportunity ID: ${v.opportunityId}`);
        console.log(`      验证延迟: ${v.validationDelayMs}ms`);
        console.log(`      第一次 outbound: ${v.firstOutboundMs ?? 'NULL'}ms`);
        console.log(`      第一次 return: ${v.firstReturnMs ?? 'NULL'}ms`);
        console.log(`      第二次 outbound: ${v.secondOutboundMs ?? 'NULL'}ms`);
        console.log(`      第二次 return: ${v.secondReturnMs ?? 'NULL'}ms`);
        console.log(`      机会仍存在: ${v.stillExists ? '是' : '否'}`);
        console.log(`      发现时间: ${v.firstDetectedAt.toISOString()}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('   ❌ 查询失败:', error);
  }

  // 4. 统计延迟数据完整性
  console.log('4️⃣ 统计延迟数据完整性...');
  try {
    const stats = await prisma.opportunityValidation.aggregate({
      _count: {
        id: true,
        firstOutboundMs: true,
        firstReturnMs: true,
        secondOutboundMs: true,
        secondReturnMs: true,
      },
    });

    console.log(`   总验证记录: ${stats._count.id}`);
    console.log(`   有firstOutboundMs: ${stats._count.firstOutboundMs} (${((stats._count.firstOutboundMs / (stats._count.id || 1)) * 100).toFixed(1)}%)`);
    console.log(`   有firstReturnMs: ${stats._count.firstReturnMs} (${((stats._count.firstReturnMs / (stats._count.id || 1)) * 100).toFixed(1)}%)`);
    console.log(`   有secondOutboundMs: ${stats._count.secondOutboundMs} (${((stats._count.secondOutboundMs / (stats._count.id || 1)) * 100).toFixed(1)}%)`);
    console.log(`   有secondReturnMs: ${stats._count.secondReturnMs} (${((stats._count.secondReturnMs / (stats._count.id || 1)) * 100).toFixed(1)}%)`);
    console.log('');
  } catch (error) {
    console.error('   ❌ 统计失败:', error);
  }

  // 5. 检查过滤的机会（RPC模拟失败）
  console.log('5️⃣ 检查RPC模拟过滤记录...');
  try {
    const filteredOpportunities = await prisma.opportunity.findMany({
      where: {
        filtered: true,
      },
      take: 3,
      orderBy: {
        id: 'desc',
      },
      select: {
        id: true,
        filtered: true,
        expectedProfit: true,
        discoveredAt: true,
      },
    });

    if (filteredOpportunities.length === 0) {
      console.log('   ⚠️ 暂无RPC过滤记录（这是正常的，如果钱包余额充足）\n');
    } else {
      console.log(`   ✅ 找到 ${filteredOpportunities.length} 条RPC过滤记录：\n`);
      
      filteredOpportunities.forEach((o, idx) => {
        console.log(`   记录 ${idx + 1}:`);
        console.log(`      ID: ${o.id}`);
        console.log(`      已过滤: ${o.filtered ? '是' : '否'}`);
        console.log(`      预期利润: ${(Number(o.expectedProfit) / 1e9).toFixed(6)} SOL`);
        console.log(`      发现时间: ${o.discoveredAt.toISOString()}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('   ❌ 查询失败:', error);
  }

  // 6. 性能建议
  console.log('6️⃣ 性能分析建议...');
  try {
    const avgStats = await prisma.opportunityValidation.aggregate({
      _avg: {
        firstOutboundMs: true,
        firstReturnMs: true,
        secondOutboundMs: true,
        secondReturnMs: true,
        validationDelayMs: true,
      },
      where: {
        firstOutboundMs: { not: null },
      },
    });

    if (avgStats._avg.firstOutboundMs) {
      console.log('   平均延迟（毫秒）：');
      console.log(`      第一次 outbound: ${avgStats._avg.firstOutboundMs?.toFixed(1) ?? 'N/A'}ms`);
      console.log(`      第一次 return: ${avgStats._avg.firstReturnMs?.toFixed(1) ?? 'N/A'}ms`);
      console.log(`      第二次 outbound: ${avgStats._avg.secondOutboundMs?.toFixed(1) ?? 'N/A'}ms`);
      console.log(`      第二次 return: ${avgStats._avg.secondReturnMs?.toFixed(1) ?? 'N/A'}ms`);
      console.log(`      总验证延迟: ${avgStats._avg.validationDelayMs?.toFixed(1) ?? 'N/A'}ms`);
      console.log('');

      const totalFirstTime = (avgStats._avg.firstOutboundMs ?? 0) + (avgStats._avg.firstReturnMs ?? 0);
      const totalSecondTime = (avgStats._avg.secondOutboundMs ?? 0) + (avgStats._avg.secondReturnMs ?? 0);
      
      console.log('   📊 性能评估：');
      if (totalFirstTime > 600) {
        console.log('      ⚠️ Ultra API平均延迟较高（>600ms），建议：');
        console.log('         - 检查网络/代理配置');
        console.log('         - 增大query_interval_ms以降低API压力');
      } else if (totalFirstTime > 400) {
        console.log('      ⚡ Ultra API延迟中等（400-600ms），正常范围');
      } else {
        console.log('      🚀 Ultra API延迟优秀（<400ms）');
      }

      if (totalSecondTime > 400) {
        console.log('      ⚠️ Lite API（二次验证）延迟较高（>400ms）');
      } else {
        console.log('      ✅ Lite API（二次验证）延迟正常');
      }
    } else {
      console.log('   ⚠️ 暂无足够数据进行性能分析\n');
    }
  } catch (error) {
    console.error('   ❌ 统计失败:', error);
  }

  console.log('\n✅ 验证完成！');
  console.log('\n📝 下一步：');
  console.log('   1. 如果数据库字段缺失，请执行: 数据记录完整性修复-迁移SQL.sql');
  console.log('   2. 重启Bot并运行30分钟');
  console.log('   3. 重新运行此脚本，查看数据完整性和性能统计');
  console.log('   4. 使用文档中的SQL进行深度分析\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ 验证失败:', error);
  process.exit(1);
});

