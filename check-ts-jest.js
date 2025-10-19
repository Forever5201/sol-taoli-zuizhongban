const fs = require('fs');
const path = require('path');

const tsJestPath = path.join(__dirname, 'node_modules', 'ts-jest');
console.log('检查路径:', tsJestPath);
console.log('存在:', fs.existsSync(tsJestPath));

if (fs.existsSync(tsJestPath)) {
  const files = fs.readdirSync(tsJestPath);
  console.log('文件:', files.slice(0, 10));
}

// 尝试require
try {
  const tsJest = require('ts-jest');
  console.log('✅ ts-jest可以require');
} catch (e) {
  console.log('❌ ts-jest无法require:', e.message);
}
