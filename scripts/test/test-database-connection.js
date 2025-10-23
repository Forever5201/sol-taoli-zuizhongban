/**
 * 测试数据库连接和配置
 */

// 从packages/core加载Prisma客户端
const { PrismaClient } = require('./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('\n=== 数据库连接测试 ===\n');

  // 检查环境变量
  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: DATABASE_URL 环境变量未设置');
    console.log('\n请创建 .env 文件并添加:');
    console.log('DATABASE_URL="postgresql://arbitrage_user:arbitrage_password@localhost:5432/arbitrage_db"');
    process.exit(1);
  }

  console.log('✅ DATABASE_URL 已配置');
  console.log(`   连接字符串: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@')}\n`);

  const prisma = new PrismaClient();

  try {
    // 测试数据库连接
    console.log('正在测试数据库连接...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功!\n');

    // 检查表是否存在
    console.log('检查数据库表...');
    try {
      const opportunityCount = await prisma.opportunity.count();
      const tradeCount = await prisma.trade.count();
      
      console.log('✅ 数据库表结构正确!');
      console.log(`   - opportunities 表: ${opportunityCount} 条记录`);
      console.log(`   - trades 表: ${tradeCount} 条记录\n`);

      // 测试写入一条记录
      console.log('测试数据库写入...');
      const testOpportunity = await prisma.opportunity.create({
        data: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'So11111111111111111111111111111111111111112',
          bridgeToken: 'TEST-TOKEN',
          bridgeMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          inputAmount: BigInt(10_000_000_000),
          outputAmount: BigInt(10_050_000_000),
          expectedProfit: BigInt(50_000_000),
          expectedRoi: 0.5,
          executed: false,
          filtered: false,
          metadata: {
            test: true,
            timestamp: Date.now(),
          },
        },
      });

      console.log('✅ 测试记录写入成功!');
      console.log(`   记录 ID: ${testOpportunity.id}\n`);

      // 删除测试记录
      await prisma.opportunity.delete({
        where: { id: testOpportunity.id },
      });
      console.log('✅ 测试记录已清理\n');

      console.log('═══════════════════════════════════════');
      console.log('🎉 数据库配置完成！');
      console.log('═══════════════════════════════════════');
      console.log('\n现在你可以启动机器人，所有套利机会将自动记录到数据库！\n');
      console.log('启动命令:');
      console.log('  pnpm start --config ./configs/flashloan-serverchan.toml\n');

    } catch (tableError) {
      console.error('❌ 数据库表不存在或结构不正确');
      console.log('\n请运行数据库迁移:');
      console.log('  cd packages/core');
      console.log('  pnpm db:migrate\n');
      throw tableError;
    }

  } catch (error) {
    console.error('\n❌ 数据库连接失败!\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('错误原因: PostgreSQL 服务未运行\n');
      console.log('解决方法:');
      console.log('1. 安装 PostgreSQL:');
      console.log('   - Windows: 从 https://www.postgresql.org/download/windows/ 下载安装');
      console.log('   - 或使用 Chocolatey: choco install postgresql\n');
      console.log('2. 启动 PostgreSQL 服务:');
      console.log('   - Windows: 在服务管理器中启动 "postgresql" 服务');
      console.log('   - 或使用命令: net start postgresql-x64-15\n');
      console.log('3. 创建数据库:');
      console.log('   psql -U postgres');
      console.log('   CREATE USER arbitrage_user WITH PASSWORD \'arbitrage_password\';');
      console.log('   CREATE DATABASE arbitrage_db;');
      console.log('   GRANT ALL PRIVILEGES ON DATABASE arbitrage_db TO arbitrage_user;');
      console.log('   \\q\n');
    } else if (error.code === 'P1001') {
      console.log('错误原因: 无法连接到数据库服务器\n');
      console.log('请检查:');
      console.log('1. PostgreSQL 是否已安装并运行');
      console.log('2. .env 文件中的连接信息是否正确');
      console.log('3. 防火墙是否允许连接到端口 5432\n');
    } else if (error.code === '28P01') {
      console.log('错误原因: 用户名或密码错误\n');
      console.log('请检查 .env 文件中的数据库用户名和密码\n');
    } else if (error.code === '3D000') {
      console.log('错误原因: 数据库不存在\n');
      console.log('请创建数据库:');
      console.log('  psql -U postgres');
      console.log('  CREATE DATABASE arbitrage_db;');
      console.log('  \\q\n');
    } else {
      console.log('错误详情:', error.message);
      console.log('错误代码:', error.code);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testDatabaseConnection().catch(console.error);

