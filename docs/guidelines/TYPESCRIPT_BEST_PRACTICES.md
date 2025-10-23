# TypeScript Monorepo 最佳实践

## 🎯 根本问题

我们的项目频繁出现编译错误，根本原因是：

1. **TypeScript 配置混乱**
2. **包依赖管理不规范**
3. **构建流程不确定**

---

## ✅ 推荐的项目结构

### 根 tsconfig.json（仅作为基准）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  },
  "exclude": ["node_modules", "dist"]
}
```

### 每个包的 tsconfig.json（独立配置）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    
    // 关键：明确指定输入输出
    "rootDir": "./src",
    "outDir": "./dist",
    
    // 关键：启用声明文件
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    
    // 关键：Composite 项目
    "composite": true,
    
    // 其他标准配置
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## 🔗 正确的包依赖引用

### package.json 正确配置

```json
{
  "name": "@solana-arb-bot/core",
  "version": "1.0.0",
  
  // 关键：正确指定入口
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  
  // 关键：exports 字段
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./economics": {
      "types": "./dist/economics/index.d.ts",
      "default": "./dist/economics/index.js"
    }
  }
}
```

### 引用方式

```typescript
// ✅ 正确：使用包名
import { ConnectionPool } from '@solana-arb-bot/core';

// ❌ 错误：使用相对路径跨包
import { ConnectionPool } from '../../../core/src/solana/connection';

// ✅ 正确：包内相对路径
import { ConnectionPool } from './solana/connection';
```

---

## 🏗️ 正确的构建流程

### 构建顺序

```bash
# 1. 清理所有构建产物
pnpm clean

# 2. 按依赖顺序构建
pnpm --filter @solana-arb-bot/core build
pnpm --filter @solana-arb-bot/onchain-bot build
pnpm --filter @solana-arb-bot/jupiter-bot build

# 3. 或使用 TypeScript 项目引用
pnpm tsc -b
```

### package.json scripts

```json
{
  "scripts": {
    "clean": "rimraf dist tsconfig.tsbuildinfo",
    "build": "tsc --build",
    "build:watch": "tsc --build --watch",
    "rebuild": "pnpm clean && pnpm build"
  }
}
```

---

## 🔍 调试编译问题

### 检查声明文件是否生成

```bash
# 检查 core 包
dir packages\core\dist\index.d.ts

# 检查所有声明文件
dir packages\core\dist\*.d.ts /s
```

### 查看 TypeScript 编译详情

```bash
# 详细输出
pnpm tsc --build --verbose

# 列出所有文件
pnpm tsc --build --listFiles

# 强制重新构建
pnpm tsc --build --force
```

### 清理缓存

```bash
# 删除所有构建缓存
find . -name "tsconfig.tsbuildinfo" -delete
find . -name "dist" -type d -exec rm -rf {} +

# Windows
del /s /q tsconfig.tsbuildinfo
for /d /r . %d in (dist) do @if exist "%d" rd /s /q "%d"
```

---

## 🚫 常见错误避免

### 错误 1：继承配置过度

```json
// ❌ 不好
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"  // 可能被父级覆盖
  }
}

// ✅ 好
{
  "compilerOptions": {
    // 完整独立配置
  }
}
```

### 错误 2：rootDir 设置不当

```json
// ❌ 错误
{
  "compilerOptions": {
    "rootDir": "."  // 太宽泛
  }
}

// ✅ 正确
{
  "compilerOptions": {
    "rootDir": "./src"  // 精确指向源码
  }
}
```

### 错误 3：混用构建工具

```bash
# ❌ 不要混用
tsc              # 直接用 tsc
pnpm tsc -b      # TypeScript 项目引用
webpack          # Webpack
rollup           # Rollup

# ✅ 选择一种并坚持使用
pnpm tsc -b      # 推荐用于 Monorepo
```

---

## 🎯 我们项目的具体问题

### 问题 1：根 tsconfig.json

```json
// 当前（有问题）
{
  "compilerOptions": {
    "rootDir": ".",  // ❌ 太宽泛
    "outDir": "./dist"  // ❌ 会影响子包
  }
}

// 应该改为
{
  "compilerOptions": {
    // 只设置共享选项，不设置 rootDir/outDir
  }
}
```

### 问题 2：core 包的 tsconfig.json

```json
// 当前
{
  "extends": "../../tsconfig.json",  // ❌ 继承了错误配置
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}

// 建议
{
  // 不继承，独立配置
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "composite": true,
    // ... 其他配置
  }
}
```

---

## 🔧 立即可做的改进

### 1. 创建清理脚本

```bash
# scripts/clean-all.bat
@echo off
echo Cleaning all build artifacts...
for /d /r . %%d in (dist) do @if exist "%%d" rd /s /q "%%d"
del /s /q tsconfig.tsbuildinfo
echo Done!
```

### 2. 创建正确的构建脚本

```bash
# scripts/build-all.bat
@echo off
echo Building in correct order...
call pnpm --filter @solana-arb-bot/core clean
call pnpm --filter @solana-arb-bot/core build
call pnpm --filter @solana-arb-bot/onchain-bot clean
call pnpm --filter @solana-arb-bot/onchain-bot build
echo Build complete!
```

### 3. 添加验证脚本

```bash
# scripts/verify-build.bat
@echo off
echo Verifying build outputs...
if not exist "packages\core\dist\index.d.ts" (
    echo ERROR: core index.d.ts missing!
    exit /b 1
)
if not exist "packages\onchain-bot\dist\index.js" (
    echo ERROR: onchain-bot index.js missing!
    exit /b 1
)
echo All build outputs verified!
```

---

## 📚 延伸阅读

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [pnpm Workspace](https://pnpm.io/workspaces)

---

## 🎯 总结

**为什么会频繁出现编译错误？**

1. ❌ TypeScript 配置继承混乱
2. ❌ 声明文件生成路径错误  
3. ❌ 包依赖引用方式不统一
4. ❌ 缓存机制导致增量编译错误

**如何彻底解决？**

1. ✅ 重构 tsconfig.json 配置
2. ✅ 统一使用包名引用
3. ✅ 确保构建顺序正确
4. ✅ 定期清理缓存

**现在能做什么？**

1. 使用我创建的修复脚本
2. 遇到错误先运行 clean
3. 按顺序构建包
4. 保持耐心，问题会越来越少

---

*这些最佳实践能让您的 TypeScript Monorepo 项目稳定运行！*
