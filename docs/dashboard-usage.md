# 数据库仪表板使用指南

## 📊 简介

数据库仪表板是一个Web可视化工具，用于查看和分析闪电贷机会的生命周期数据。通过这个仪表板，您可以：

- 📈 查看统计概览（总机会数、通过率、平均存活时间等）
- 📊 可视化数据分布（存活时间、利润衰减、DEX使用情况）
- 🔍 筛选和搜索验证记录
- 📄 查看机会详细信息
- 💾 导出CSV数据

## 🚀 快速开始

### 启动方式

#### 方法1：使用批处理脚本（推荐）

在项目根目录运行：

```bash
start-dashboard.bat
```

或者在scripts目录：

```bash
scripts\start-dashboard.bat
```

#### 方法2：直接运行（简洁）

在项目根目录运行：

```bash
npx tsx tools/dashboard-api.ts
```

### 访问地址

启动成功后，在浏览器中访问：

```
http://localhost:3000
```

## 📋 功能说明

### 1. 统计卡片

仪表板顶部显示4个关键指标：

- **总机会数**：从第一次发现开始记录的所有机会
- **通过验证**：通过二次验证的机会数量和通过率
- **平均存活**：机会从第一次发现到第二次验证的平均时间（毫秒）
- **平均衰减**：利润从第一次到第二次的平均衰减率（百分比）

### 2. 可视化图表

#### 机会存活时间分布（柱状图）

- 显示不同时间区间内的机会数量
- 区间：<100ms, 100-200ms, 200-300ms, 300-500ms, >500ms
- 颜色编码：绿色（快速）→ 红色（慢速）

#### DEX使用分布（饼图）

- 显示各个DEX的使用比例
- 帮助了解哪些DEX被频繁使用

#### 利润衰减率 vs 存活时间（散点图）

- X轴：存活时间（ms）
- Y轴：衰减率（%）
- 绿点：通过验证的机会
- 红点：未通过验证的机会

### 3. 数据表格

#### 筛选功能

- **全部**：显示所有记录
- **✅ 通过验证**：只显示通过二次验证的机会
- **❌ 未通过**：只显示未通过验证的机会

#### 搜索功能

在搜索框中输入关键词，可以搜索：
- 机会ID
- 桥接代币名称

#### 表格列说明

| 列名 | 说明 |
|------|------|
| ID | 机会唯一标识符 |
| 发现时间 | 第一次发现该机会的时间戳 |
| 首次利润 | 第一次查询时的预期利润（SOL） |
| 验证利润 | 第二次验证时的实际利润（SOL） |
| 衰减率 | 利润衰减百分比，颜色编码：<br>🟢 绿色（<20%）<br>🟡 黄色（20-50%）<br>🔴 红色（>50%） |
| 存活时间 | 从发现到验证的时间间隔（ms） |
| 状态 | ✅ 通过 / ❌ 失败 |
| 桥接 | 交易路径的跳数 |
| 操作 | 点击"查看"显示详情 |

#### 分页

- 每页显示20条记录
- 使用"上一页"/"下一页"按钮翻页

### 4. 详情弹窗

点击表格中的任意行或"查看"按钮，打开详情弹窗，包含：

#### 基础信息

- 首次利润和ROI
- 验证利润和ROI
- 对比分析

#### 延迟分析

- **机会存活**：验证延迟时间
- **首次查询**：第一次查询的总耗时（出站+返回）
- **验证查询**：第二次查询的总耗时

#### 路由信息

- 桥接代币
- 总跳数
- 使用的DEX列表

#### 完整元数据

- JSON格式显示所有原始数据
- 包含详细的路由计划、市场信息等

### 5. 数据导出

点击右上角的"📥 导出CSV"按钮，下载完整数据：

**CSV文件包含字段**：
- ID
- First Detected（发现时间）
- First Profit（首次利润，SOL）
- Second Profit（验证利润，SOL）
- Decay Rate（衰减率，%）
- Lifetime（存活时间，ms）
- Still Exists（是否通过）
- Bridge Token（桥接代币）
- Total Hops（总跳数）

## 🔧 技术细节

### API端点

仪表板提供以下REST API端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/stats` | GET | 统计概览数据 |
| `/api/opportunities` | GET | 机会列表（支持分页） |
| `/api/opportunities/:id` | GET | 单个机会详情 |
| `/api/validations` | GET | 验证数据列表 |
| `/api/charts/lifetime` | GET | 存活时间分布数据 |
| `/api/charts/decay` | GET | 利润衰减率数据 |
| `/api/charts/dex` | GET | DEX使用统计 |
| `/api/export/csv` | GET | 导出CSV文件 |

### 数据库要求

仪表板需要连接PostgreSQL数据库。默认连接字符串：

```
postgresql://arbitrage_user:your_password_here@localhost:5432/arbitrage_db
```

可以通过环境变量 `DATABASE_URL` 覆盖。

### 技术栈

- **后端**：Node.js + Express + Prisma
- **前端**：HTML5 + Tailwind CSS + Chart.js + Alpine.js
- **数据库**：PostgreSQL
- **端口**：3000

## 🎯 研究模式使用场景

当前配置为"机会生命周期研究模式"，主要用于：

### 研究目标

分析高质量套利机会的时间窗口，为直接执行提供数据支撑。

### 数据收集

1. **样本目标**：收集100+样本
2. **关键指标**：
   - P90存活时间（90%机会的存活时间）
   - P50存活时间（中位数）
   - 平均衰减率

### 决策依据

**如果 P90存活时间 > 250ms**（Jito打包+确认时间）：
- ✅ 可以考虑取消二次验证，直接执行
- 💰 提高执行速度，抓住更多机会

**如果 P50存活时间 < 150ms**：
- ⚠️ 必须保持二次验证
- 🛡️ 避免执行已消失的机会

### SQL分析示例

```sql
-- 计算P90存活时间
SELECT 
  AVG(validation_delay_ms) as avg_lifetime,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY validation_delay_ms) as p90_lifetime,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY validation_delay_ms) as p50_lifetime
FROM opportunity_validations
WHERE first_profit >= 4000000;

-- 分析衰减率分布
SELECT 
  CASE 
    WHEN ((first_profit - second_profit)::DECIMAL / first_profit * 100) < 20 THEN '< 20%'
    WHEN ((first_profit - second_profit)::DECIMAL / first_profit * 100) < 50 THEN '20-50%'
    ELSE '> 50%'
  END as decay_range,
  COUNT(*) as count,
  AVG(validation_delay_ms) as avg_lifetime
FROM opportunity_validations
WHERE first_profit >= 4000000
GROUP BY decay_range;
```

## ⚠️ 故障排除

### 服务器无法启动

**问题**：运行`npm run dashboard`后无法访问

**解决方案**：
1. 检查PostgreSQL是否运行
2. 验证数据库连接字符串是否正确
3. 确保端口3000未被占用：`netstat -ano | findstr :3000`
4. 查看Prisma Client是否已生成：`cd packages/core && npx prisma generate`

### 数据显示为空

**问题**：仪表板加载成功，但所有统计都是0

**原因**：数据库中没有记录

**解决方案**：
1. 启动闪电贷机器人收集数据
2. 确保配置文件中启用了数据库记录：
   ```toml
   [database]
   enabled = true
   ```

### 图表无法加载

**问题**：统计卡片显示正常，但图表空白

**解决方案**：
1. 检查浏览器控制台是否有JavaScript错误
2. 确保网络可以访问CDN：
   - Tailwind CSS
   - Chart.js
   - Alpine.js
3. 尝试刷新页面

## 📝 配置说明

### 修改端口

编辑 `tools/dashboard-api.ts`：

```typescript
const PORT = 3000;  // 修改为您想要的端口
```

### 修改数据库连接

方法1：环境变量（推荐）

创建 `.env` 文件：
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

方法2：直接修改代码

编辑 `tools/dashboard-api.ts`：
```typescript
const DATABASE_URL = 'postgresql://your_connection_string';
```

### 分页大小

编辑 `tools/dashboard.html`：

```javascript
pageSize: 20,  // 修改每页显示的记录数
```

## 🎨 自定义样式

### 修改主题颜色

编辑 `tools/dashboard.html`，在 `<style>` 标签中修改：

```css
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* 修改渐变颜色 */
}

.stat-number {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* 修改统计数字渐变 */
}
```

### 修改卡片样式

```css
.card {
  background: rgba(255, 255, 255, 0.95);
  /* 修改透明度 */
}
```

## 📚 参考资料

- [Express文档](https://expressjs.com/)
- [Prisma文档](https://www.prisma.io/docs)
- [Chart.js文档](https://www.chartjs.org/docs/)
- [Alpine.js文档](https://alpinejs.dev/)
- [Tailwind CSS文档](https://tailwindcss.com/docs)

## 💡 最佳实践

1. **定期清理旧数据**：保持数据库性能
2. **导出重要数据**：定期备份CSV文件
3. **监控统计趋势**：观察通过率和存活时间的变化
4. **调整阈值**：根据仪表板数据优化配置
5. **并发访问**：仪表板支持多用户同时访问

## 🔐 安全建议

1. **不要在生产环境暴露仪表板到公网**
2. **使用强密码保护数据库**
3. **考虑添加身份验证**（可选扩展）
4. **定期更新依赖包**
5. **使用HTTPS**（生产环境）

## 📞 获取帮助

如有问题，请检查：
1. 本文档的故障排除部分
2. 项目根目录的其他文档
3. 浏览器控制台的错误信息
4. 服务器日志输出

---

**版本**：1.0.0  
**最后更新**：2025-10-24

