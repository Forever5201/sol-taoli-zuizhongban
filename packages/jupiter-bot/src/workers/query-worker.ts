/**
 * Jupiter查询Worker
 * 
 * 在独立线程中高频查询Jupiter API
 * 实现真正的环形套利：双向查询（去程 + 回程）
 */

import { workerData, parentPort } from 'worker_threads';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';

interface WorkerConfig {
  workerId: number;
  config: {
    jupiterApiUrl: string;
    apiKey?: string;
    mints: string[];
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
  timeout: 30000,
  headers: {},
};

// 添加 API Key (如果提供)
if (config.apiKey) {
  axiosConfig.headers['X-API-Key'] = config.apiKey;
  console.log(`Worker ${workerId} using Ultra API with API Key: ${config.apiKey.slice(0, 8)}...`);
}

if (proxyUrl) {
  // 配置代理 agent（参考成功的实现）
  const agent = new HttpsProxyAgent(proxyUrl, {
    rejectUnauthorized: false, // 允许自签名证书
    timeout: 10000,
    keepAlive: true,
    keepAliveMsecs: 30000,
  });
  axiosConfig.httpsAgent = agent;
  axiosConfig.httpAgent = agent;
  axiosConfig.proxy = false; // 禁用 axios 自动代理
  console.log(`Worker ${workerId} using proxy: ${proxyUrl} (compatible with ${config.apiKey ? 'Ultra API' : 'Lite API'})`);
}

// 从配置文件加载桥接代币（零硬编码）
let BRIDGE_TOKENS: BridgeToken[] = [];
try {
  const bridgeTokensPath = join(process.cwd(), 'bridge-tokens.json');
  const rawData = readFileSync(bridgeTokensPath, 'utf-8');
  BRIDGE_TOKENS = JSON.parse(rawData)
    .filter((t: BridgeToken) => t.enabled)  // 只加载启用的
    .sort((a: BridgeToken, b: BridgeToken) => a.priority - b.priority);  // 按优先级排序
  
  console.log(`Worker ${workerId} loaded ${BRIDGE_TOKENS.length} bridge tokens from config`);
} catch (error: any) {
  console.error(`Worker ${workerId} failed to load bridge tokens:`, error.message);
  process.exit(1);
}

// 统计信息
let queriesTotal = 0;
let queryTimes: number[] = [];
let opportunitiesFound = 0;

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
      console.log(`   API: ${config.jupiterApiUrl} (${config.apiKey ? 'Ultra API with Juno engine' : 'Lite API with Metis v1'})`);
      console.log(`   API Key: ${config.apiKey ? config.apiKey.slice(0, 8) + '...' : 'N/A (free tier)'}`);
      console.log(`   Amount: ${config.amount}`);
      console.log(`   Path: ${inputMint.slice(0, 8)}... → ${bridgeToken.symbol}`);
    }

    // === 去程查询：inputMint → bridgeMint ===
    // 使用 /order API（获得 Ultra V3 完整特性：Iris, RTSE, Predictive Execution）
    const paramsOut = new URLSearchParams({
      inputMint,
      outputMint: bridgeToken.mint,  // 桥接代币
      amount: config.amount.toString(),
      // 不传 taker，只获取报价信息（不生成交易）
    });

    const responseOut = await axios.get(
      `${config.jupiterApiUrl}/v1/order?${paramsOut}`,
      axiosConfig  // 使用带代理的配置
    );

    const quoteOut = responseOut.data;
    // Ultra Order 返回 estimatedOut（vs Quote 的 outAmount）
    const outAmount = quoteOut.estimatedOut || quoteOut.outAmount;
    if (!quoteOut || !outAmount) {
      return null;
    }

    // 首次查询成功时输出
    if (queriesTotal === 0) {
      console.log(`[Worker ${workerId}] ✅ First query successful! estimatedOut: ${outAmount}`);
      console.log(`   Using Ultra Order API (Iris + Predictive Execution + RTSE)`);
    }

    // 在去程和回程查询之间添加延迟，避免突发流量触发API限流
    await sleep(800);

    // === 回程查询：bridgeMint → inputMint ===
    // 使用 /order API
    const paramsBack = new URLSearchParams({
      inputMint: bridgeToken.mint,   // 桥接代币
      outputMint: inputMint,         // 回到起点
      amount: outAmount.toString(),  // 用去程的输出
      // 不传 taker，只获取报价信息
    });

    const responseBack = await axios.get(
      `${config.jupiterApiUrl}/v1/order?${paramsBack}`,
      axiosConfig  // 使用带代理的配置
    );

    const quoteBack = responseBack.data;
    const backOutAmount = quoteBack.estimatedOut || quoteBack.outAmount;
    if (!quoteBack || !backOutAmount) {
      return null;
    }

    // === 计算利润 ===
    const inputAmount = parseInt(config.amount.toString());
    const outputAmount = parseInt(backOutAmount);
    const profit = outputAmount - inputAmount;
    const roi = (profit / inputAmount) * 100;

    const queryTime = Date.now() - startTime;
    queryTimes.push(queryTime);
    if (queryTimes.length > 100) queryTimes.shift();

    queriesTotal += 2;  // 双向查询算2次

    // 每100次查询发送一次统计
    if (queriesTotal % 100 === 0) {
      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      parentPort?.postMessage({
        type: 'stats',
        data: {
          queriesTotal: 100,
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
      outRoute: quoteOut.routePlan || [],
      backRoute: quoteBack.routePlan || [],
      queryTime,
      // Ultra Order 额外信息
      ultraOrderInfo: {
        outSlippageBps: quoteOut.slippageBps,
        backSlippageBps: quoteBack.slippageBps,
        outFeeBps: quoteOut.feeBps,
        backFeeBps: quoteBack.feeBps,
      },
    };

  } catch (error: any) {
    if (error.response?.status === 404) {
      // No route found - 正常情况，不输出错误
      return null;
    }

    // 只记录非404错误
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
  console.log(`Worker ${workerId} started with ${config.mints.length} initial tokens × ${BRIDGE_TOKENS.length} bridge tokens`);
  
  const totalPaths = config.mints.length * BRIDGE_TOKENS.length;
  console.log(`Worker ${workerId} will monitor ${totalPaths} arbitrage paths`);

  let scanCount = 0;
  let lastHeartbeat = Date.now();

  while (true) {
    scanCount++;
    console.log(`[Worker ${workerId}] 🔄 Starting scan round ${scanCount}...`);
    
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

          // 每次查询后延迟（避免限流）
          await sleep(config.queryIntervalMs);

        } catch (error: any) {
          parentPort?.postMessage({
            type: 'error',
            data: `Scan error (${bridgeToken.symbol}): ${error.message}`,
          });
        }
      }
    }
  }
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 启动扫描循环
scanLoop().catch(error => {
  parentPort?.postMessage({
    type: 'error',
    data: `Worker ${workerId} fatal error: ${error.message}`,
  });
  process.exit(1);
});
