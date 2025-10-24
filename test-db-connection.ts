import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// 加载根目录的.env
dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  console.log('');
  console.log('🔍 测试数据库连接...');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);
  console.log('');
  
  try {
    // 测试连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功！');
    console.log('');
    
    // 检查表是否存在
    console.log('📋 检查数据库表...');
    const tables = await prisma.$queryRaw<any[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log(`找到 ${tables.length} 个表:`);
    for (const table of tables) {
      console.log(`   - ${table.table_name}`);
    }
    console.log('');
    
    // 检查Opportunity表的行数
    if (tables.some((t: any) => t.table_name === 'Opportunity')) {
      const oppCount = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as count FROM "Opportunity"`;
      console.log(`📊 Opportunity表: ${oppCount[0].count} 条记录`);
    }
    
    // 检查OpportunityValidation表的行数
    if (tables.some((t: any) => t.table_name === 'OpportunityValidation')) {
      const valCount = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as count FROM "OpportunityValidation"`;
      console.log(`📊 OpportunityValidation表: ${valCount[0].count} 条记录`);
    }
    
  } catch (error) {
    console.error('❌ 数据库错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

