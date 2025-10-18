/**
 * Jupiter查询Worker
 * 
 * 在独立线程中高频查询Jupiter API
 */

import { workerData, parentPort } from 'worker_threads';
import axios from 'axios';

interface WorkerConfig {
  workerId: number;
  config: {
    jupiterApiUrl: string;
    mints: string[];
    amount: number;
    minProfitLamports: number;
    queryIntervalMs: number;
    slippageBps: number;
  };
}

const { workerId, config } = workerData as WorkerConfig;

// 统计信息
let queriesTotal = 0;
let queryTimes: number[] = [];

/**
 * 查询环形套利
 */
async function queryCircularArbitrage(inputMint: string): Promise<any> {
  const startTime = Date.now();

  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint: inputMint, // 环形套利：输出=输入
      amount: config.amount.toString(),
      slippageBps: config.slippageBps.toString(),
      onlyDirectRoutes: 'false',
    });

    const response = await axios.get(
      `${config.jupiterApiUrl}/quote?${params}`,
      { timeout: 5000 }
    );

    const queryTime = Date.now() - startTime;
    queryTimes.push(queryTime);
    if (queryTimes.length > 100) queryTimes.shift(); // 保留最近100次

    queriesTotal++;

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

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      // No route found - 正常情况，不输出错误
      return null;
    }

    parentPort?.postMessage({
      type: 'error',
      data: `Query failed: ${error.message}`,
    });

    return null;
  }
}

/**
 * 验证机会
 */
function validateOpportunity(quote: any): boolean {
  if (!quote) return false;

  const inputAmount = parseInt(quote.inAmount);
  const outputAmount = parseInt(quote.outAmount);
  const profit = outputAmount - inputAmount;

  return profit >= config.minProfitLamports;
}

/**
 * 主循环
 */
async function scanLoop(): Promise<void> {
  console.log(`Worker ${workerId} started with ${config.mints.length} mints`);

  while (true) {
    for (const mint of config.mints) {
      try {
        const quote = await queryCircularArbitrage(mint);

        if (validateOpportunity(quote)) {
          const inputAmount = parseInt(quote.inAmount);
          const outputAmount = parseInt(quote.outAmount);
          const profit = outputAmount - inputAmount;
          const roi = (profit / inputAmount) * 100;

          // 发送机会到主线程
          parentPort?.postMessage({
            type: 'opportunity',
            data: {
              inputMint: quote.inputMint,
              outputMint: quote.outputMint,
              inputAmount,
              outputAmount,
              profit,
              roi,
              route: quote.routePlan?.map((step: any) => ({
                dex: step.swapInfo.label,
                inputMint: step.swapInfo.inputMint,
                outputMint: step.swapInfo.outputMint,
                inAmount: step.swapInfo.inAmount,
                outAmount: step.swapInfo.outAmount,
              })) || [],
            },
          });
        }

        // 短暂延迟避免过载
        await sleep(config.queryIntervalMs);
      } catch (error: any) {
        parentPort?.postMessage({
          type: 'error',
          data: `Scan error: ${error.message}`,
        });
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
