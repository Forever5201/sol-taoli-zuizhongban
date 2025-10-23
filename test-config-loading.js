const fs = require('fs');
const toml = require('toml');

const configPath = 'configs/flashloan-dryrun.toml';
const config = toml.parse(fs.readFileSync(configPath, 'utf-8'));

console.log('\n📋 配置文件内容检查:');
console.log('=====================================');
console.log(`配置文件路径: ${configPath}`);
console.log(`Worker数量: ${config.opportunity_finder.worker_count}`);
console.log(`查询间隔: ${config.opportunity_finder.query_interval_ms}ms`);
console.log(`最小利润: ${config.opportunity_finder.min_profit_lamports} lamports`);
console.log('=====================================\n');

if (config.opportunity_finder.query_interval_ms !== 5000) {
  console.log('❌ 错误！查询间隔不是5000ms！');
  console.log(`   当前值: ${config.opportunity_finder.query_interval_ms}ms`);
  console.log(`   期望值: 5000ms`);
  process.exit(1);
} else {
  console.log('✅ 配置正确：查询间隔 = 5000ms');
}

