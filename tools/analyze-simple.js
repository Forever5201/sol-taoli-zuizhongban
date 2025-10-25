/**
 * 简单的数据库分析脚本（使用pg）
 */

const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:Yuan971035088@localhost:5432/postgres"
});

async function analyzeData() {
  try {
    await client.connect();
    console.log('🔍 开始分析验证数据...\n');
    console.log('═'.repeat(80));

    // 1. 总体统计
    console.log('\n📊 1. 总体统计（最近1000条记录）');
    console.log('─'.repeat(80));
    
    const totalResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN still_exists THEN 1 END) as passed,
        ROUND(COUNT(CASE WHEN still_exists THEN 1 END)::NUMERIC / COUNT(*) * 100, 2) as pass_rate,
        ROUND(AVG(validation_delay_ms), 0) as avg_delay_ms
      FROM (SELECT * FROM opportunity_validations ORDER BY first_detected_at DESC LIMIT 1000) recent
    `);
    
    console.log(totalResult.rows[0]);

    // 2. 按时间段统计
    console.log('\n\n📊 2. 按时间段统计');
    console.log('─'.repeat(80));
    
    const timeStats = await client.query(`
      SELECT 
        '昨天08:53-23:54' as time_range,
        COUNT(*) as total,
        COUNT(CASE WHEN still_exists THEN 1 END) as passed,
        ROUND(COUNT(CASE WHEN still_exists THEN 1 END)::NUMERIC / COUNT(*) * 100, 2) as pass_rate
      FROM opportunity_validations
      WHERE first_detected_at >= '2025-10-24 08:53:00' AND first_detected_at <= '2025-10-24 23:54:00'
      UNION ALL
      SELECT 
        '今天00:20-10:54' as time_range,
        COUNT(*) as total,
        COUNT(CASE WHEN still_exists THEN 1 END) as passed,
        ROUND(COUNT(CASE WHEN still_exists THEN 1 END)::NUMERIC / COUNT(*) * 100, 2) as pass_rate
      FROM opportunity_validations
      WHERE first_detected_at >= '2025-10-25 00:20:00' AND first_detected_at <= '2025-10-25 10:54:00'
    `);
    
    timeStats.rows.forEach(row => {
      console.log(`\n${row.time_range}:`);
      console.log(`  总机会数: ${row.total}`);
      console.log(`  通过验证: ${row.passed}`);
      console.log(`  通过率: ${row.pass_rate}%`);
    });

    // 3. Worker高估误差分析
    console.log('\n\n📊 3. Worker高估误差分析（关键！）');
    console.log('─'.repeat(80));
    
    const overestimated = await client.query(`
      SELECT 
        COUNT(*) as count,
        ROUND(AVG(first_profit - second_profit) / 1e9, 6) as avg_error_sol,
        ROUND(AVG((first_profit - second_profit)::NUMERIC / first_profit * 100), 2) as avg_error_pct
      FROM opportunity_validations
      WHERE first_profit > 5000000 AND second_profit < 5000000
    `);
    
    console.log(`\n🔥 Worker高估案例（Worker>0.005 但 Main<0.005）: ${overestimated.rows[0].count} 个`);
    if (overestimated.rows[0].count > 0) {
      console.log(`平均高估误差: ${overestimated.rows[0].avg_error_sol} SOL (${overestimated.rows[0].avg_error_pct}%)`);
      
      console.log(`\n前10个高估案例详情：`);
      const cases = await client.query(`
        SELECT 
          first_detected_at,
          ROUND(first_profit / 1e9, 6) as worker_profit_sol,
          ROUND(second_profit / 1e9, 6) as main_profit_sol,
          ROUND((first_profit - second_profit) / 1e9, 6) as error_sol,
          ROUND((first_profit - second_profit)::NUMERIC / first_profit * 100, 2) as error_pct,
          validation_delay_ms
        FROM opportunity_validations
        WHERE first_profit > 5000000 AND second_profit < 5000000
        ORDER BY first_detected_at DESC
        LIMIT 10
      `);
      
      console.log(`${'Worker利润'.padEnd(15)} ${'Main利润'.padEnd(15)} ${'误差'.padEnd(15)} ${'误差率'.padEnd(10)} 延迟`);
      console.log('─'.repeat(80));
      cases.rows.forEach(row => {
        console.log(
          `${String(row.worker_profit_sol).padEnd(15)} ` +
          `${String(row.main_profit_sol).padEnd(15)} ` +
          `${String(row.error_sol).padEnd(15)} ` +
          `${String(row.error_pct).padEnd(10)}% ` +
          `${row.validation_delay_ms}ms`
        );
      });
    }

    // 4. 利润分布
    console.log('\n\n📊 4. Worker第一次利润分布');
    console.log('─'.repeat(80));
    
    const profitDist = await client.query(`
      SELECT 
        CASE 
          WHEN first_profit < 2000000 THEN '<0.002 SOL'
          WHEN first_profit < 5000000 THEN '0.002-0.005 SOL'
          WHEN first_profit < 10000000 THEN '0.005-0.010 SOL'
          WHEN first_profit < 20000000 THEN '0.010-0.020 SOL'
          ELSE '>0.020 SOL'
        END as profit_range,
        COUNT(*) as count,
        COUNT(CASE WHEN still_exists THEN 1 END) as passed,
        ROUND(COUNT(CASE WHEN still_exists THEN 1 END)::NUMERIC / COUNT(*) * 100, 2) as pass_rate
      FROM (SELECT * FROM opportunity_validations ORDER BY first_detected_at DESC LIMIT 1000) recent
      GROUP BY 
        CASE 
          WHEN first_profit < 2000000 THEN '<0.002 SOL'
          WHEN first_profit < 5000000 THEN '0.002-0.005 SOL'
          WHEN first_profit < 10000000 THEN '0.005-0.010 SOL'
          WHEN first_profit < 20000000 THEN '0.010-0.020 SOL'
          ELSE '>0.020 SOL'
        END
      ORDER BY MIN(first_profit)
    `);
    
    profitDist.rows.forEach(row => {
      console.log(`${row.profit_range.padEnd(20)}: ${String(row.count).padStart(4)} 个  (通过率: ${row.pass_rate}%)`);
    });

    // 5. 通过与失败对比
    console.log('\n\n📊 5. 通过 vs 失败详细对比（最近1000条）');
    console.log('─'.repeat(80));
    
    const comparison = await client.query(`
      SELECT 
        CASE WHEN still_exists THEN '✅ 通过验证' ELSE '❌ 验证失败' END as status,
        COUNT(*) as count,
        ROUND(AVG(first_profit) / 1e9, 6) as avg_first_profit_sol,
        ROUND(AVG(second_profit) / 1e9, 6) as avg_second_profit_sol,
        ROUND(AVG(validation_delay_ms), 0) as avg_delay_ms
      FROM (SELECT * FROM opportunity_validations ORDER BY first_detected_at DESC LIMIT 1000) recent
      GROUP BY still_exists
      ORDER BY still_exists DESC
    `);
    
    comparison.rows.forEach(row => {
      console.log(`\n${row.status} (${row.count} 个):`);
      console.log(`  平均第一次利润: ${row.avg_first_profit_sol} SOL`);
      console.log(`  平均第二次利润: ${row.avg_second_profit_sol} SOL`);
      console.log(`  平均验证延迟: ${row.avg_delay_ms}ms`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ 分析完成\n');

  } catch (error) {
    console.error('❌ 分析出错:', error);
  } finally {
    await client.end();
  }
}

analyzeData();

