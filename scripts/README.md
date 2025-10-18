# 🔧 Scripts 工具目录

这个目录包含了用于开发和部署的各种脚本工具。

---

## 📋 脚本列表

### 环境设置

| 脚本 | 平台 | 用途 |
|------|------|------|
| `setup-env.bat` | Windows | 完整环境设置 |
| `setup-env.sh` | Linux/Mac | 完整环境设置 |
| `verify-env.bat` | Windows | 验证环境配置 |

### Jito集成

| 脚本 | 平台 | 用途 |
|------|------|------|
| `install-jito.bat` | Windows | 安装Jito依赖 |
| `install-jito.sh` | Linux/Mac | 安装Jito依赖 |

---

## 🚀 使用方法

### Windows

```bash
# 完整环境设置
.\scripts\setup-env.bat

# 验证环境
.\scripts\verify-env.bat

# 安装Jito
.\scripts\install-jito.bat
```

### Linux/Mac

```bash
# 添加执行权限
chmod +x scripts/*.sh

# 完整环境设置
./scripts/setup-env.sh

# 安装Jito
./scripts/install-jito.sh
```

---

## 📝 手动安装（如果脚本失败）

### 1. 根目录安装

```bash
cd e:\6666666666666666666666666666\dex-cex\dex-sol
npm install
```

### 2. 安装core包

```bash
cd packages\core
npm install
cd ..\..
```

### 3. 安装onchain-bot包

```bash
cd packages\onchain-bot
npm install
cd ..\..
```

### 4. 构建项目

```bash
npm run build
```

### 5. 测试运行

```bash
npm run demo
```

---

## ⚠️ 常见问题

### Windows PowerShell执行策略错误

如果遇到"无法加载文件，因为在此系统上禁止运行脚本"：

```powershell
# 以管理员身份运行PowerShell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### npm install 速度慢

使用国内镜像（中国用户）：

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### 权限错误

Windows: 以管理员身份运行  
Linux/Mac: 使用 sudo 或修改文件权限

---

## 📚 更多信息

详细的环境设置指南请查看：
- `ENVIRONMENT_SETUP.md` - 完整环境设置指南
- `README.md` - 项目总览
