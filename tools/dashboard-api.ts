/**
 * 数据库查看仪表板 API 服务器
 * 
 * 提供REST API用于查询和分析机会生命周期数据
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// 加载环境变量
dotenv.config();

// ESM模块路径解析
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const app = express();
const PORT = 3000;

// 动态加载Prisma Client
let prisma;
try {
  const { PrismaClient } = require('@prisma/client');
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://arbitrage_user:your_password_here@localhost:5432/arbitrage_db';
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
    log: ['error', 'warn'],
  });
  console.log('✅ Prisma Client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Prisma Client:', error.message);
  console.error('⚠️  Database features will not be available');
}

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// CORS支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

/**
 * GET / - 返回前端页面
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

/**
 * 递归转换对象中的所有BigInt为Number
 */
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  // 保留Date对象，避免破坏日期序列化
  if (obj instanceof Date) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToNumber(item));
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted;
  }
  
  return obj;
}

// 中间件：检查数据库连接
const checkDatabase = (req, res, next) => {
  if (!prisma) {
    return res.status(503).json({ 
      error: 'Database not available',
      message: 'Prisma Client initialization failed. Check database configuration.'
    });
  }
  next();
};

/**
 * GET /api/stats - 统计概览数据
 */
app.get('/api/stats', checkDatabase, async (req, res) => {
  try {
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;
    
    console.log('📊 /api/stats 收到时间参数:', { startTime, endTime });
    
    let whereClause = '';
    const params: any[] = [];
    
    if (startTime || endTime) {
      const conditions: string[] = [];
      if (startTime) {
        const startDate = new Date(startTime);
        console.log('  开始时间转换:', startTime, '=>', startDate);
        conditions.push(`first_detected_at >= $${params.length + 1}`);
        params.push(startDate);
      }
      if (endTime) {
        const endDate = new Date(endTime);
        console.log('  结束时间转换:', endTime, '=>', endDate);
        conditions.push(`first_detected_at <= $${params.length + 1}`);
        params.push(endDate);
      }
      whereClause = 'WHERE ' + conditions.join(' AND ');
      console.log('  WHERE子句:', whereClause, '参数:', params);
    }
    
    const stats = await prisma.$queryRawUnsafe<Array<{
      total: bigint;
      passed: bigint;
      avg_lifetime: number | null;
      avg_decay: number | null;
    }>>(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN still_exists THEN 1 END) as passed,
        AVG(validation_delay_ms) as avg_lifetime,
        AVG(CASE 
          WHEN second_profit > 0 
          THEN ((first_profit - second_profit)::DECIMAL / first_profit) * 100
          ELSE NULL 
        END) as avg_decay
      FROM opportunity_validations
      ${whereClause}
    `, ...params);

    const result = stats[0] || {
      total: BigInt(0),
      passed: BigInt(0),
      avg_lifetime: null,
      avg_decay: null
    };

    res.json({
      total: Number(result.total),
      passed: Number(result.passed),
      passRate: Number(result.total) > 0 
        ? (Number(result.passed) / Number(result.total) * 100).toFixed(1)
        : '0',
      avgLifetime: result.avg_lifetime 
        ? Math.round(result.avg_lifetime)
        : 0,
      avgDecay: result.avg_decay 
        ? Number(result.avg_decay).toFixed(1)
        : '0'
    });
  } catch (error: any) {
    console.error('Stats query error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/opportunities - 机会列表（分页、筛选）
 */
app.get('/api/opportunities', checkDatabase, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const opportunities = await prisma.opportunity.findMany({
      skip,
      take: limit,
      orderBy: {
        discoveredAt: 'desc'
      },
      include: {
        validation: true
      }
    });

    const total = await prisma.opportunity.count();

    res.json({
      data: opportunities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Opportunities query error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/opportunities/:id - 单个机会详情
 */
app.get('/api/opportunities/:id', checkDatabase, async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        validation: true
      }
    });

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json(opportunity);
  } catch (error: any) {
    console.error('Opportunity detail query error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/validations - 验证数据列表
 */
app.get('/api/validations', checkDatabase, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const stillExists = req.query.stillExists;
    const timeRange = req.query.timeRange as string;
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;
    
    const where: any = {};
    if (stillExists !== undefined) {
      where.stillExists = stillExists === 'true';
    }
    
    // 自定义时间范围优先
    if (startTime || endTime) {
      where.firstDetectedAt = {};
      if (startTime) {
        where.firstDetectedAt.gte = new Date(startTime);
      }
      if (endTime) {
        where.firstDetectedAt.lte = new Date(endTime);
      }
    }
    // 时间范围过滤（快捷选项）
    else if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch(timeRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      where.firstDetectedAt = {
        gte: startDate
      };
    }

    const validations = await prisma.opportunityValidation.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        firstDetectedAt: 'desc'
      },
      include: {
        opportunity: {
          select: {
            bridgeToken: true,
            metadata: true,
            inputMint: true,
            outputMint: true
          }
        }
      }
    });

    const total = await prisma.opportunityValidation.count({ where });

    // 转换所有BigInt为数字
    const formattedValidations = convertBigIntToNumber(validations);

    res.json({
      data: formattedValidations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Validations query error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/charts/lifetime - 存活时间分布数据
 */
app.get('/api/charts/lifetime', checkDatabase, async (req, res) => {
  try {
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (startTime || endTime) {
      const conditions: string[] = [];
      if (startTime) {
        conditions.push(`first_detected_at >= $${params.length + 1}`);
        params.push(new Date(startTime));
      }
      if (endTime) {
        conditions.push(`first_detected_at <= $${params.length + 1}`);
        params.push(new Date(endTime));
      }
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const distribution = await prisma.$queryRawUnsafe<Array<{
      bucket: string;
      count: bigint;
      sort_order: number;
    }>>(`
      SELECT 
        bucket,
        COUNT(*) as count,
        sort_order
      FROM (
        SELECT 
          CASE 
            WHEN validation_delay_ms < 100 THEN '<100ms'
            WHEN validation_delay_ms < 200 THEN '100-200ms'
            WHEN validation_delay_ms < 300 THEN '200-300ms'
            WHEN validation_delay_ms < 500 THEN '300-500ms'
            ELSE '>500ms'
          END as bucket,
          CASE 
            WHEN validation_delay_ms < 100 THEN 1
            WHEN validation_delay_ms < 200 THEN 2
            WHEN validation_delay_ms < 300 THEN 3
            WHEN validation_delay_ms < 500 THEN 4
            ELSE 5
          END as sort_order
        FROM opportunity_validations
        ${whereClause}
      ) subquery
      GROUP BY bucket, sort_order
      ORDER BY sort_order
    `, ...params);

    const labels = ['<100ms', '100-200ms', '200-300ms', '300-500ms', '>500ms'];
    const data = labels.map(label => {
      const item = distribution.find(d => d.bucket === label);
      return item ? Number(item.count) : 0;
    });

    res.json({ labels, data });
  } catch (error: any) {
    console.error('Lifetime chart query error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/charts/decay - 利润衰减率分布数据
 */
app.get('/api/charts/decay', checkDatabase, async (req, res) => {
  try {
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;
    
    let whereClause = 'WHERE first_profit > 0';
    const params: any[] = [];
    
    if (startTime || endTime) {
      const conditions: string[] = ['first_profit > 0'];
      if (startTime) {
        conditions.push(`first_detected_at >= $${params.length + 1}`);
        params.push(new Date(startTime));
      }
      if (endTime) {
        conditions.push(`first_detected_at <= $${params.length + 1}`);
        params.push(new Date(endTime));
      }
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const decayData = await prisma.$queryRawUnsafe<Array<{
      validation_delay_ms: number;
      decay_rate: number;
      still_exists: boolean;
    }>>(`
      SELECT 
        validation_delay_ms,
        CASE 
          WHEN second_profit > 0 
          THEN ((first_profit - second_profit)::DECIMAL / first_profit) * 100
          ELSE 100
        END as decay_rate,
        still_exists
      FROM opportunity_validations
      ${whereClause}
      ORDER BY validation_delay_ms
    `, ...params);

    const passed = decayData
      .filter(d => d.still_exists)
      .map(d => ({
        x: d.validation_delay_ms,
        y: Number(d.decay_rate)
      }));

    const failed = decayData
      .filter(d => !d.still_exists)
      .map(d => ({
        x: d.validation_delay_ms,
        y: Number(d.decay_rate)
      }));

    res.json({ passed, failed });
  } catch (error: any) {
    console.error('Decay chart query error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/charts/dex - DEX使用统计
 */
app.get('/api/charts/dex', checkDatabase, async (req, res) => {
  try {
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;
    
    const where: any = {
      metadata: {
        not: null
      }
    };
    
    if (startTime || endTime) {
      where.discoveredAt = {};
      if (startTime) {
        where.discoveredAt.gte = new Date(startTime);
      }
      if (endTime) {
        where.discoveredAt.lte = new Date(endTime);
      }
    }
    
    const opportunities = await prisma.opportunity.findMany({
      select: {
        metadata: true
      },
      where
    });

    const dexCount: Record<string, number> = {};

    opportunities.forEach(opp => {
      const metadata = opp.metadata as any;
      if (metadata?.routeInfo?.dexes) {
        metadata.routeInfo.dexes.forEach((dex: string) => {
          dexCount[dex] = (dexCount[dex] || 0) + 1;
        });
      }
    });

    const labels = Object.keys(dexCount);
    const data = Object.values(dexCount);

    res.json({ labels, data });
  } catch (error: any) {
    console.error('DEX chart query error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/csv - 导出CSV
 */
app.get('/api/export/csv', checkDatabase, async (req, res) => {
  try {
    const validations = await prisma.opportunityValidation.findMany({
      include: {
        opportunity: {
          select: {
            bridgeToken: true,
            metadata: true
          }
        }
      },
      orderBy: {
        firstDetectedAt: 'desc'
      }
    });

    // 构建CSV
    const headers = [
      'ID',
      'First Detected',
      'First Profit (SOL)',
      'Second Profit (SOL)',
      'Decay Rate (%)',
      'Lifetime (ms)',
      'Still Exists',
      'Bridge Token',
      'Total Hops'
    ].join(',');

    const rows = validations.map(v => {
      const firstProfit = (Number(v.firstProfit) / 1e9).toFixed(6);
      const secondProfit = v.secondProfit 
        ? (Number(v.secondProfit) / 1e9).toFixed(6)
        : '0';
      const decayRate = v.secondProfit
        ? (((Number(v.firstProfit) - Number(v.secondProfit)) / Number(v.firstProfit)) * 100).toFixed(2)
        : '100.00';
      const metadata = v.opportunity.metadata as any;
      const totalHops = metadata?.routeInfo?.totalHops || 0;

      return [
        v.id,
        v.firstDetectedAt.toISOString(),
        firstProfit,
        secondProfit,
        decayRate,
        v.validationDelayMs,
        v.stillExists ? 'Yes' : 'No',
        v.opportunity.bridgeToken || 'Unknown',
        totalHops
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=opportunities.csv');
    res.send(csv);
  } catch (error: any) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  📊 数据库仪表板 API 服务器已启动        ║
╚══════════════════════════════════════════╝

🌐 访问地址: http://localhost:${PORT}
📡 API 端点: http://localhost:${PORT}/api/*

可用API:
  GET  /api/stats              - 统计概览
  GET  /api/opportunities      - 机会列表
  GET  /api/opportunities/:id  - 机会详情
  GET  /api/validations        - 验证数据
  GET  /api/charts/lifetime    - 存活时间图表
  GET  /api/charts/decay       - 衰减率图表
  GET  /api/charts/dex         - DEX统计图表
  GET  /api/export/csv         - 导出CSV

按 Ctrl+C 停止服务器
  `);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n\n正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

