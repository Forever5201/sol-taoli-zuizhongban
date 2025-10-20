// 测试导入 core 包
try {
  const core = require('../packages/core/dist/index.js');
  console.log('✅ Core package import successful');
  console.log('Exports:', Object.keys(core));
} catch (error: any) {
  console.error('❌ Import failed:', error.message);
  process.exit(1);
}
