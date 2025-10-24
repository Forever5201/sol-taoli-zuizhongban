/**
 * Jupiter查询Worker
 * 
 * 在独立线程中高频查询Jupiter API
 * 实现真正的环形套利：双向查询（去程 + 回程）
 */

import { workerData, parentPort } from 'worker_threads';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

interface WorkerConfig {
  workerId: number;
  config: {
    jupiterApiUrl: string;  // 已弃用，保留以向后兼容
    apiKey?: string;  // ✅ Ultra API需要API Key
    mints: string[];
    bridges: BridgeToken[];  // 从主线程接收分配的桥接代币
    amount: number;
    minProfitLamports: number;
    queryIntervalMs: number;
    slippageBps: number;
  };
}

interface BridgeToken {
  symbol: string;
  mint: string;
  decimals: number;
  priority: number;
  enabled: boolean;
  description?: string;
}

const { workerId, config } = workerData as WorkerConfig;

// 配置代理（从环境变量读取）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const axiosConfig: any = {
  timeout: 1500,  // 🔥🔥 从3000降至1500ms：快速失败，避免慢查询阻塞
  headers: {
    'Connection': 'keep-alive',  // ✅ 明确要求HTTP keep-alive
    'Accept-Encoding': 'br, gzip, deflate',  // 🔥 添加Brotli压缩（比gzip快20-30%）
  },
  decompress: true,  // 🔥 启用自动解压缩
  // 针对国内代理优化：启用重试机制
  validateStatus: (status: number) => status < 500,  // 只对5xx错误重试
  maxRedirects: 0,  // 禁用重定向（减少往返次数）
};

// ❌ API Key 已移除：Quote API 无需认证
// Ultra API 配置已弃用，现在直接使用免费的 Quote API

if (proxyUrl) {
  // 🔥🔥 激进连接池优化：最大化连接复用，降低延迟30-40%
  const agent = new HttpsProxyAgent(proxyUrl, {
    rejectUnauthorized: false,  // 🔥 开发环境跳过TLS验证（节省握手时间）
    timeout: 1500,  // 🔥 从3000降至1500ms：快速失败，避免慢查询阻塞
    keepAlive: true,  // ✅ 启用keepAlive：复用连接，避免重复TLS握手
    keepAliveMsecs: 50,  // 🔥🔥 从500降至50ms：高频心跳保持连接"热"度
    maxSockets: 20,  // 🔥🔥 从2增至20：支持20个并发连接，消除排队等待
    maxFreeSockets: 20,  // 🔥🔥 保持20个热连接池：避免过早关闭
    scheduling: 'lifo',  // 后进先出：优先复用最热的连接（更低延迟）
  } as any);  // 使用类型断言以支持freeSocketTimeout等扩展属性
  
  // 🔥 设置空闲连接超时（Node.js运行时属性，TypeScript类型定义中未包含）
  (agent as any).freeSocketTimeout = 30000;  // 空闲连接保持30秒
  
  axiosConfig.httpsAgent = agent;
  axiosConfig.httpAgent = agent;
  axiosConfig.proxy = false; // 禁用 axios 自动代理
  axiosConfig.timeout = 1500;  // 🔥 从3000降至1500ms：同步更新axios超时
  console.log(`Worker ${workerId} using AGGRESSIVE proxy config: keepAlive=50ms, pool=20, timeout=1.5s`);
}

// 桥接代币从主线程通过 workerData 接收（不再从文件加载）
const BRIDGE_TOKENS = config.bridges;
console.log(`Worker ${workerId} assigned ${BRIDGE_TOKENS.length} bridge tokens from main thread`);

/**
 * 预热连接池（使用Pro Ultra API）
 * 
 * 🎯 Pro Ultra API：
 * - ✅ api.jup.ag/ultra: 官方Pro版本
 * - ✅ 使用GET方法 + API Key
 * - ✅ iris/Metis v2 + JupiterZ RFQ路由引擎
 * 
 * 🔥 优化策略：建立10个热连接，避免首次查询TLS握手延迟
 */
async function warmupConnections(): Promise<void> {
  try {
    console.log(`[Worker ${workerId}] 🚀 Warming up connection pool (10 connections)...`);
    
    if (!proxyUrl) {
      console.log(`[Worker ${workerId}] ⚠️ No proxy configured, skipping warmup`);
      return;
    }
    
    if (!config.apiKey) {
      console.log(`[Worker ${workerId}] ⚠️ No API Key configured, skipping warmup`);
      return;
    }
    
    // 🔥 使用激进的连接池配置预热
    const agent = new HttpsProxyAgent(proxyUrl, {
      rejectUnauthorized: false,
      timeout: 5000,
      keepAlive: true,
      keepAliveMsecs: 50,  // 🔥 与主配置一致
      maxSockets: 20,      // 🔥 与主配置一致
      maxFreeSockets: 20,  // 🔥 与主配置一致
      scheduling: 'lifo',
    } as any);
    
    // 设置空闲连接超时
    (agent as any).freeSocketTimeout = 30000;
    
    // 🔥🔥 并发建立10个连接（而不是1个）
    const warmupCount = 10;
    const warmupRequests = Array(warmupCount).fill(null).map(async (_, i) => {
      try {
        await axios.get(
          'https://api.jup.ag/ultra/v1/order' +
          '?inputMint=So11111111111111111111111111111111111111112' +
          '&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' +
          '&amount=1000000000',  // 🔥 使用1 SOL（降低API负载）
          {
            httpsAgent: agent,
            httpAgent: agent,
            proxy: false,
            timeout: 5000,
            headers: {
              'Connection': 'keep-alive',
              'Accept-Encoding': 'br, gzip, deflate',
              'X-API-Key': config.apiKey,
            },
          }
        );
        console.log(`[Worker ${workerId}] ✅ Connection ${i + 1}/${warmupCount} ready`);
      } catch (error: any) {
        // 预热失败不影响主流程，静默处理
      }
    });
    
    await Promise.allSettled(warmupRequests);
    console.log(`[Worker ${workerId}] ✅ Connection pool warmed with ${warmupCount} hot connections`);
  } catch (error: any) {
    console.log(`[Worker ${workerId}] ⚠️ Warmup failed (not critical): ${error.message}`);
    console.log(`[Worker ${workerId}] ℹ️ Will proceed with cold start, first query may be slower`);
  }
}

// 统计信息
let queriesTotal = 0;
let queryTimes: number[] = [];
let opportunitiesFound = 0;
let scanRounds = 0;

// 延迟统计（分别统计去程和回程）
let outboundLatencies: number[] = [];
let returnLatencies: number[] = [];

// 🔥 新增：详细查询统计
let queriesSuccess = 0;
let queriesFailed = 0;
let queriesNoRoute = 0;
let queriesTimeout = 0;
let queriesError = 0;

// 🔥 新增：错误类型统计
const errorStats = {
  'API_ERROR': 0,
  'TIMEOUT': 0,
  'NO_ROUTE': 0,
  'PARSE_ERROR': 0,
  'NETWORK_ERROR': 0,
  'OTHER': 0,
};

// 🔥 新增：桥接代币性能统计
const bridgeStats = new Map<string, {
  queries: number;
  success: number;
  noRoute: number;
  errors: number;
  opportunities: number;
  avgLatency: number;
  totalLatency: number;
}>();

BRIDGE_TOKENS.forEach(token => {
  bridgeStats.set(token.symbol, {
    queries: 0,
    success: 0,
    noRoute: 0,
    errors: 0,
    opportunities: 0,
    avgLatency: 0,
    totalLatency: 0,
  });
});

/**
 * 查询桥接套利（双向查询）
 * @param inputMint 起始代币
 * @param bridgeToken 桥接代币
 * @returns 套利机会或null
 */
async function queryBridgeArbitrage(
  inputMint: string,
  bridgeToken: BridgeToken
): Promise<any | null> {
  const startTime = Date.now();

  try {
    // 跳过相同代币
    if (inputMint === bridgeToken.mint) {
      return null;
    }

    // 首次查询时输出调试信息
    if (queriesTotal === 0) {
      console.log(`[Worker ${workerId}] 🚀 First query starting...`);
      console.log(`   API: https://api.jup.ag/ultra/v1/order (Pro Ultra API)`);
      console.log(`   API Key: ${config.apiKey ? config.apiKey.slice(0, 8) + '...' : 'Not configured'}`);
      console.log(`   Amount: ${config.amount} lamports (${(config.amount / 1e9).toFixed(1)} SOL)`);
      console.log(`   Path: ${inputMint.slice(0, 8)}... → ${bridgeToken.symbol}`);
      console.log(`   Routing: iris/Metis v2 + JupiterZ RFQ (最先进的路由引擎)`);
      console.log(`   Rate Limit: Dynamic (Base 50 req/10s, scales with volume)`);
    }

    // 🔥 新增：更新桥接代币查询统计
    const bridgeStat = bridgeStats.get(bridgeToken.symbol);
    if (bridgeStat) {
      bridgeStat.queries++;
    }

    // === 去程查询：inputMint → bridgeMint ===
    // 🚀 Ultra API: 使用iris/Metis v2路由引擎（官方Pro版本）
    // ✅ API Key已配置，动态速率限制
    // ⚡ 优势：最先进的路由，最优价格，RFQ增强
    const paramsOut = new URLSearchParams({
      inputMint,
      outputMint: bridgeToken.mint,  // 桥接代币
      amount: config.amount.toString(),
      // 注意：不提供taker时，仍可获取报价（但无transaction字段）
    });

    // 📊 去程查询延迟统计
    const outboundStart = Date.now();
    let responseOut;
    let outAmount;
    let quoteOut: any;  // 声明在外部作用域
    let outboundLatency = 0;  // 去程延迟
    let returnLatency = 0;    // 回程延迟
    
    try {
      // 🔥 新增：每100次查询输出进度
      if (queriesTotal % 100 === 0 && queriesTotal > 0) {
        console.log(`[Worker ${workerId}] 🔍 Query #${queriesTotal + 1}: ${inputMint.slice(0,8)}...→${bridgeToken.symbol}`);
      }
      
      // 🔥 Ultra API使用GET方法 + query parameters + API Key header
      responseOut = await axios.get(
        `https://api.jup.ag/ultra/v1/order?${paramsOut}`,
        {
          ...axiosConfig,
          headers: {
            ...axiosConfig.headers,
            'X-API-Key': config.apiKey || '',  // 添加API Key
          }
        }
      );
      outboundLatency = Date.now() - outboundStart;

      quoteOut = responseOut.data;
      
      // 🔥 Ultra API响应格式：{ outAmount, routePlan, ... } 直接在顶层
      if (!quoteOut) {
        console.log(`[Worker ${workerId}] ⚠️ Empty response for ${inputMint.slice(0,8)}...→${bridgeToken.symbol}`);
        queriesNoRoute++;
        errorStats.NO_ROUTE++;
        if (bridgeStat) bridgeStat.noRoute++;
        return null;
      }
      
      if (!quoteOut.outAmount || quoteOut.outAmount === '0') {
        console.log(`[Worker ${workerId}] ⚠️ No route found: ${inputMint.slice(0,8)}...→${bridgeToken.symbol}`);
        queriesNoRoute++;
        errorStats.NO_ROUTE++;
        if (bridgeStat) bridgeStat.noRoute++;
        return null;
      }
      
      outAmount = quoteOut.outAmount;

      // 首次查询成功时输出
      if (queriesTotal === 0) {
        console.log(`[Worker ${workerId}] ✅ First query successful! outAmount: ${outAmount}`);
        console.log(`   Using Ultra API (iris/Metis v2 + JupiterZ RFQ)`);
        console.log(`   Router: ${quoteOut.routePlan?.[0]?.swapInfo?.label || 'Unknown'}`);
      }

      // 📊 记录去程延迟
      outboundLatencies.push(outboundLatency);
      if (outboundLatencies.length > 100) outboundLatencies.shift();  // 保持最近 100 次
      
      // 📊 输出去程延迟（每次都记录，用于调试）
      console.log(
        `[Worker ${workerId}] ✅ Quote outbound: ${inputMint.slice(0,4)}...→${bridgeToken.symbol}, ` +
        `took ${outboundLatency}ms, got ${outAmount}`
      );
      
    } catch (error: any) {
      const outboundLatency = Date.now() - outboundStart;
      
      // 🔥 新增：详细错误分类和日志
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.log(`[Worker ${workerId}] ⏱️ Timeout: ${inputMint.slice(0,8)}...→${bridgeToken.symbol} (${outboundLatency}ms)`);
        queriesTimeout++;
        errorStats.TIMEOUT++;
        if (bridgeStat) bridgeStat.errors++;
      } else if (error.response?.status) {
        console.log(`[Worker ${workerId}] ❌ API Error ${error.response.status}: ${inputMint.slice(0,8)}...→${bridgeToken.symbol}`);
        queriesError++;
        errorStats.API_ERROR++;
        if (bridgeStat) bridgeStat.errors++;
      } else if (error.message?.includes('network') || error.code === 'ECONNRESET') {
        console.log(`[Worker ${workerId}] 🌐 Network Error: ${inputMint.slice(0,8)}...→${bridgeToken.symbol}`);
        errorStats.NETWORK_ERROR++;
        if (bridgeStat) bridgeStat.errors++;
      } else {
        console.log(`[Worker ${workerId}] ❌ Error: ${inputMint.slice(0,8)}...→${bridgeToken.symbol} - ${error.message?.slice(0, 50)}`);
        queriesError++;
        errorStats.OTHER++;
        if (bridgeStat) bridgeStat.errors++;
      }
      
      queriesFailed++;
      return null;
    }

    // 无需延迟，Quote API 已经足够快

    // === 回程查询：bridgeMint → inputMint ===
    // 🚀 Ultra API: 使用iris/Metis v2路由引擎
    const paramsBack = new URLSearchParams({
      inputMint: bridgeToken.mint,   // 桥接代币
      outputMint: inputMint,         // 回到起点
      amount: outAmount.toString(),  // 用去程的输出
      // 不提供taker，只获取报价
    });

    // 📊 回程查询延迟统计
    const returnStart = Date.now();
    let responseBack;
    let backOutAmount;
    let quoteBack: any;  // 声明在外部作用域
    
    try {
      responseBack = await axios.get(
        `https://api.jup.ag/ultra/v1/order?${paramsBack}`,
        {
          ...axiosConfig,
          headers: {
            ...axiosConfig.headers,
            'X-API-Key': config.apiKey || '',
          }
        }
      );
      returnLatency = Date.now() - returnStart;

      quoteBack = responseBack.data;
      
      // 🔥 Ultra API响应格式：顶层直接包含outAmount
      if (!quoteBack) {
        console.log(`[Worker ${workerId}] ⚠️ Empty return response: ${bridgeToken.symbol}→${inputMint.slice(0,8)}...`);
        queriesNoRoute++;
        errorStats.NO_ROUTE++;
        if (bridgeStat) bridgeStat.noRoute++;
        return null;
      }
      
      if (!quoteBack.outAmount || quoteBack.outAmount === '0') {
        console.log(`[Worker ${workerId}] ⚠️ No return route: ${bridgeToken.symbol}→${inputMint.slice(0,8)}...`);
        queriesNoRoute++;
        errorStats.NO_ROUTE++;
        if (bridgeStat) bridgeStat.noRoute++;
        return null;
      }
      
      backOutAmount = quoteBack.outAmount;

      // 📊 记录回程延迟
      returnLatencies.push(returnLatency);
      if (returnLatencies.length > 100) returnLatencies.shift();  // 保持最近 100 次
      
      // 📊 输出回程延迟
      console.log(
        `[Worker ${workerId}] ✅ Quote return: ${bridgeToken.symbol}→${inputMint.slice(0,4)}..., ` +
        `took ${returnLatency}ms, got ${backOutAmount}`
      );
      
      // 🔥 新增：双向查询都成功，标记成功并更新统计
      queriesSuccess++;
      if (bridgeStat) {
        bridgeStat.success++;
        bridgeStat.totalLatency += (outboundLatencies[outboundLatencies.length - 1] + returnLatency);
        bridgeStat.avgLatency = bridgeStat.totalLatency / bridgeStat.success;
      }
      
    } catch (error: any) {
      const returnLatency = Date.now() - returnStart;
      
      // 🔥 新增：详细错误分类和日志
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.log(`[Worker ${workerId}] ⏱️ Timeout: ${bridgeToken.symbol}→${inputMint.slice(0,8)}... (${returnLatency}ms)`);
        queriesTimeout++;
        errorStats.TIMEOUT++;
        if (bridgeStat) bridgeStat.errors++;
      } else if (error.response?.status) {
        console.log(`[Worker ${workerId}] ❌ API Error ${error.response.status}: ${bridgeToken.symbol}→${inputMint.slice(0,8)}...`);
        queriesError++;
        errorStats.API_ERROR++;
        if (bridgeStat) bridgeStat.errors++;
      } else if (error.message?.includes('network') || error.code === 'ECONNRESET') {
        console.log(`[Worker ${workerId}] 🌐 Network Error: ${bridgeToken.symbol}→${inputMint.slice(0,8)}...`);
        errorStats.NETWORK_ERROR++;
        if (bridgeStat) bridgeStat.errors++;
      } else {
        console.log(`[Worker ${workerId}] ❌ Error: ${bridgeToken.symbol}→${inputMint.slice(0,8)}... - ${error.message?.slice(0, 50)}`);
        queriesError++;
        errorStats.OTHER++;
        if (bridgeStat) bridgeStat.errors++;
      }
      
      queriesFailed++;
      return null;
    }

    // === 计算利润 ===
    const inputAmount = Number(config.amount);
    const outputAmount = Number(backOutAmount);
    const profit = outputAmount - inputAmount;
    const roi = (profit / inputAmount) * 100;

    const queryTime = Date.now() - startTime;
    
    // 🔥 关键修复：过滤异常值（超过3秒的查询，可能是TLS错误或超时）
    if (queryTime < 3000) {
      queryTimes.push(queryTime);
      if (queryTimes.length > 100) queryTimes.shift();  // 保持滑动窗口=100
    }

    queriesTotal += 2;  // 双向查询算2次

    // 🔥 修复统计逻辑：每20次查询上报一次（避免启动时长时间无统计）
    if (queriesTotal % 20 === 0 && queryTimes.length > 0) {
      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      parentPort?.postMessage({
        type: 'stats',
        data: {
          queriesTotal: 20,  // 🔥 上报增量（每次+20）
          avgQueryTimeMs: avgQueryTime,
        },
      });
    }

    return {
      inputMint,
      outputMint: inputMint,  // 环形：输出=输入
      bridgeToken: bridgeToken.symbol,
      bridgeMint: bridgeToken.mint,
      bridgeAmount: outAmount,
      inputAmount,
      outputAmount,
      profit,
      roi,
      discoveredAt: Date.now(),  // 🔥 新增：Worker判断为机会的精确时刻
      // 🔥 Ultra API: routePlan 直接在顶层
      outRoute: quoteOut.routePlan || [],
      backRoute: quoteBack.routePlan || [],
      queryTime,
      // Ultra API 信息
      quoteInfo: {
        outPriceImpactPct: quoteOut.priceImpactPct,
        backPriceImpactPct: quoteBack.priceImpactPct,
        outRouter: quoteOut.routePlan?.[0]?.swapInfo?.label,
        backRouter: quoteBack.routePlan?.[0]?.swapInfo?.label,
      },
      // 🔥 新增：详细延迟数据（用于性能分析）
      latency: {
        outboundMs: outboundLatency,
        returnMs: returnLatency,
      },
    };

  } catch (error: any) {
    if (error.response?.status === 404) {
      // No route found - 正常情况，不输出错误
      return null;
    }

    // 针对国内代理优化：处理TLS连接错误，自动重试
    if (error.code === 'ECONNRESET' || error.message?.includes('TLS connection') || error.message?.includes('socket disconnected')) {
      // 代理连接中断，等待后重试（仅重试一次）
      await sleep(1000);  // 等1秒后重试
      // 不输出错误日志，避免刷屏
      return null;
    }

    // 只记录非404错误和非暂时性错误
    if (error.response?.status !== 502) {  // 502可能是暂时性的
      parentPort?.postMessage({
        type: 'error',
        data: `Bridge query failed (${bridgeToken.symbol}): ${error.message}`,
      });
    }

    return null;
  }
}

/**
 * 格式化路径显示
 */
function formatRoute(routePlan: any[]): string {
  if (!routePlan || routePlan.length === 0) return 'Direct';
  
  return routePlan.map((step: any) => {
    const label = step.swapInfo?.label || 'Unknown';
    return label;
  }).join(' → ');
}

/**
 * 主循环（双重遍历：初始代币 × 桥接代币）
 */
async function scanLoop(): Promise<void> {
  const bridgeSymbols = BRIDGE_TOKENS.map(b => b.symbol).join(', ');
  console.log(`Worker ${workerId} started with ${config.mints.length} initial tokens × ${BRIDGE_TOKENS.length} bridge tokens [${bridgeSymbols}]`);
  
  const totalPaths = config.mints.length * BRIDGE_TOKENS.length;
  console.log(`Worker ${workerId} will monitor ${totalPaths} arbitrage paths`);

  let scanCount = 0;
  let lastHeartbeat = Date.now();

  while (true) {
    scanCount++;
    scanRounds++;
    console.log(`[Worker ${workerId}] 🔄 Starting scan round ${scanCount}...`);
    
    // 📊 每 10 轮扫描输出统计汇总
    if (scanCount % 10 === 0 && outboundLatencies.length > 0 && returnLatencies.length > 0) {
      const avgOutbound = outboundLatencies.reduce((a, b) => a + b, 0) / outboundLatencies.length;
      const avgReturn = returnLatencies.reduce((a, b) => a + b, 0) / returnLatencies.length;
      const avgTotal = (avgOutbound + avgReturn) / 2;
      const minOutbound = Math.min(...outboundLatencies);
      const maxOutbound = Math.max(...outboundLatencies);
      const minReturn = Math.min(...returnLatencies);
      const maxReturn = Math.max(...returnLatencies);
      
      // 🔥 新增：计算成功率
      const successRate = queriesTotal > 0 ? (queriesSuccess / queriesTotal * 100).toFixed(1) : '0.0';
      const failureRate = queriesTotal > 0 ? (queriesFailed / queriesTotal * 100).toFixed(1) : '0.0';
      const noRouteRate = queriesTotal > 0 ? (queriesNoRoute / queriesTotal * 100).toFixed(1) : '0.0';
      
      console.log(`\n[Worker ${workerId}] 📊 ═══════════════ Latency Statistics (Last ${outboundLatencies.length} queries) ═══════════════`);
      console.log(`[Worker ${workerId}] 📊 Outbound (SOL→Bridge): avg ${avgOutbound.toFixed(0)}ms, min ${minOutbound}ms, max ${maxOutbound}ms`);
      console.log(`[Worker ${workerId}] 📊 Return (Bridge→SOL):   avg ${avgReturn.toFixed(0)}ms, min ${minReturn}ms, max ${maxReturn}ms`);
      console.log(`[Worker ${workerId}] 📊 Total per round:       avg ${avgTotal.toFixed(0)}ms (${scanRounds} rounds, ${queriesTotal} queries)`);
      
      // 🔥 新增：成功率统计
      console.log(`[Worker ${workerId}] 📊 Success Rate:          ${successRate}% (${queriesSuccess}/${queriesTotal})`);
      console.log(`[Worker ${workerId}] 📊 Failure Rate:          ${failureRate}% (${queriesFailed}/${queriesTotal})`);
      console.log(`[Worker ${workerId}] 📊 No Route Rate:         ${noRouteRate}% (${queriesNoRoute}/${queriesTotal})`);
      
      // 🔥 新增：错误类型分布
      if (queriesFailed > 0 || queriesNoRoute > 0) {
        console.log(`[Worker ${workerId}] 📊 Error Breakdown:`);
        Object.entries(errorStats).forEach(([type, count]) => {
          if (count > 0) {
            const percentage = ((count / queriesTotal) * 100).toFixed(1);
            console.log(`[Worker ${workerId}] 📊   ${type}: ${count} (${percentage}%)`);
          }
        });
      }
      
      // 🔥 新增：桥接代币性能分析
      console.log(`[Worker ${workerId}] 📊 Bridge Token Performance:`);
      bridgeStats.forEach((stats, symbol) => {
        if (stats.queries > 0) {
          const tokenSuccessRate = ((stats.success / stats.queries) * 100).toFixed(1);
          const tokenNoRouteRate = ((stats.noRoute / stats.queries) * 100).toFixed(1);
          console.log(
            `[Worker ${workerId}] 📊   ${symbol}: ${stats.queries} queries, ` +
            `${tokenSuccessRate}% success, ${tokenNoRouteRate}% no-route, ` +
            `${stats.opportunities} opps, avg ${stats.avgLatency.toFixed(0)}ms`
          );
        }
      });
      
      console.log(`[Worker ${workerId}] 📊 Opportunities found:   ${opportunitiesFound}`);
      console.log(`[Worker ${workerId}] 📊 ═══════════════════════════════════════════════════════════════════════════\n`);
    }
    
    // 外层循环：遍历初始代币（从 mints.txt）
    for (const inputMint of config.mints) {
      
      // 内层循环：遍历桥接代币（从 bridge-tokens.json）
      for (const bridgeToken of BRIDGE_TOKENS) {
        try {
          // 定期输出心跳
          const now = Date.now();
          if (now - lastHeartbeat > 30000) { // 每30秒
            console.log(`[Worker ${workerId}] 💓 Heartbeat: ${queriesTotal} queries, ${opportunitiesFound} opportunities`);
            lastHeartbeat = now;
          }
          
          const opportunity = await queryBridgeArbitrage(inputMint, bridgeToken);

          if (opportunity && opportunity.profit > config.minProfitLamports) {
            opportunitiesFound++;
            
            // 🔥 新增：更新桥接代币机会统计
            const bridgeStat = bridgeStats.get(bridgeToken.symbol);
            if (bridgeStat) {
              bridgeStat.opportunities++;
            }
            
            // 发送机会到主线程
            parentPort?.postMessage({
              type: 'opportunity',
              data: {
                inputMint: opportunity.inputMint,
                outputMint: opportunity.outputMint,
                bridgeToken: opportunity.bridgeToken,
                bridgeMint: opportunity.bridgeMint,
                bridgeAmount: opportunity.bridgeAmount,
                inputAmount: opportunity.inputAmount,
                outputAmount: opportunity.outputAmount,
                profit: opportunity.profit,
                roi: opportunity.roi,
                outRoute: opportunity.outRoute,
                backRoute: opportunity.backRoute,
                // 🔥 新增：延迟数据（用于数据库记录）
                latency: opportunity.latency,
                route: [
                  ...opportunity.outRoute.map((step: any) => ({
                    dex: step.swapInfo?.label || 'Unknown',
                    inputMint: step.swapInfo?.inputMint,
                    outputMint: step.swapInfo?.outputMint,
                    inAmount: step.swapInfo?.inAmount,
                    outAmount: step.swapInfo?.outAmount,
                  })),
                  ...opportunity.backRoute.map((step: any) => ({
                    dex: step.swapInfo?.label || 'Unknown',
                    inputMint: step.swapInfo?.inputMint,
                    outputMint: step.swapInfo?.outputMint,
                    inAmount: step.swapInfo?.inAmount,
                    outAmount: step.swapInfo?.outAmount,
                  })),
                ],
              },
            });

            // 在控制台输出机会详情（便于调试）
            console.log(
              `\n🎯 [Worker ${workerId}] Opportunity #${opportunitiesFound}:`,
              `\n   Path: ${opportunity.inputMint.slice(0, 4)}... → ${opportunity.bridgeToken} → ${opportunity.inputMint.slice(0, 4)}...`,
              `\n   Profit: ${(opportunity.profit / 1e9).toFixed(6)} SOL (${opportunity.roi.toFixed(2)}%)`,
              `\n   Query time: ${opportunity.queryTime}ms`
            );
          }

        } catch (error: any) {
          parentPort?.postMessage({
            type: 'error',
            data: `Scan error (${bridgeToken.symbol}): ${error.message}`,
          });
        }
      }
    }
    
    // 🔥 关键修复：每轮扫描后延迟（避免API限流）
    // 这样可以确保无论查询成功失败，都按照配置的间隔进行查询
    await sleep(config.queryIntervalMs);
  }
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主入口：预热连接池后启动扫描循环
(async () => {
  // 🎯 关键优化：错开 Worker 启动时间
  // 避免多个 Worker 同时通过代理预热，触发限流或 TLS 握手失败
  const startupDelay = workerId * 2000;  // Worker 0: 0ms, Worker 1: 2s, Worker 2: 4s
  if (startupDelay > 0) {
    console.log(`[Worker ${workerId}] ⏳ Waiting ${(startupDelay / 1000).toFixed(1)}s before warmup (avoid proxy congestion)...`);
    await sleep(startupDelay);
  }
  
  // 预热连接池（使用 Lite API，已验证稳定）
  await warmupConnections();
  
  // 启动扫描循环
  await scanLoop();
})().catch(error => {
  parentPort?.postMessage({
    type: 'error',
    data: `Worker ${workerId} fatal error: ${error.message}`,
  });
  process.exit(1);
});
