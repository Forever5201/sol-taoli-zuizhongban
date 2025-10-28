#!/usr/bin/env tsx
/**
 * 检查元数据中的池子信息结构
 */

import { PrismaClient } from '../packages/core/node_modules/@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:Yuan971035088@localhost:5432/postgres'
    }
  }
});

async function inspectPoolMetadata() {
  console.log('🔍 检查元数据中的池子信息...\n');

  const opportunities = await prisma.opportunity.findMany({
    select: {
      metadata: true,
    },
    take: 5
  });

  console.log(`📊 检查前 ${opportunities.length} 条记录\n`);

  opportunities.forEach((opp, index) => {
    console.log(`\n=== 记录 ${index + 1} ===`);
    const metadata = opp.metadata as any;
    
    if (!metadata) {
      console.log('无 metadata');
      return;
    }

    console.log('metadata 顶级键:', Object.keys(metadata));

    if (metadata.routeInfo) {
      console.log('\nrouteInfo 键:', Object.keys(metadata.routeInfo));
      
      if (metadata.routeInfo.outboundRoute && metadata.routeInfo.outboundRoute.length > 0) {
        console.log('\noutboundRoute[0] 键:', Object.keys(metadata.routeInfo.outboundRoute[0]));
        console.log('\noutboundRoute[0] 完整内容:');
        console.log(JSON.stringify(metadata.routeInfo.outboundRoute[0], null, 2));
        
        if (metadata.routeInfo.outboundRoute.length > 1) {
          console.log('\noutboundRoute[1] 完整内容:');
          console.log(JSON.stringify(metadata.routeInfo.outboundRoute[1], null, 2));
        }
      }

      if (metadata.routeInfo.returnRoute && metadata.routeInfo.returnRoute.length > 0) {
        console.log('\nreturnRoute[0] 键:', Object.keys(metadata.routeInfo.returnRoute[0]));
        console.log('\nreturnRoute[0] 完整内容:');
        console.log(JSON.stringify(metadata.routeInfo.returnRoute[0], null, 2));
      }
    }

    // 检查是否有其他可能包含池子信息的字段
    if (metadata.prices) {
      console.log('\nprices 键:', Object.keys(metadata.prices));
    }

    if (metadata.validation) {
      console.log('\nvalidation 键:', Object.keys(metadata.validation));
    }
  });

  await prisma.$disconnect();
}

if (require.main === module) {
  inspectPoolMetadata()
    .then(() => {
      console.log('\n\n✅ 检查完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 检查失败:', error);
      process.exit(1);
    });
}

