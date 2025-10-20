/**
 * Jupiter机会发现器
 * 
 * 高频查询本地Jupiter API，发现环形套利机会
 * 使用Worker Threads实现并行查询
 */

import { Worker } from 'worker_threads';
import { PublicKey } from '@solana/web3.js';
import { createLogger } from '../../core/src/logger';
import path from 'path';
import os from 'os';

const logger = createLogger('OpportunityFinder');

/**
 * 套利机会接口
 */
export interface ArbitrageOpportunity {
  /** 输入代币 */
  inputMint: PublicKey;
  /** 输出代币（环形套利中等于输入） */
  outputMint: PublicKey;
  /** 输入金额 */
  inputAmount: number;
  /** 输出金额 */
  outputAmount: number;
  /** 利润（lamports） */
  profit: number;
  /** ROI百分比 */
  roi: number;
  /** 路由信息 */
  route: RouteInfo[];
  /** 发现时间 */
  timestamp: number;
}

export interface RouteInfo {
  dex: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
}

/**
 * 配置接口
 */
export interface OpportunityFinderConfig {
  /** Jupiter API URL */
  jupiterApiUrl: string;
  /** 目标代币列表 */
  mints: PublicKey[];
  /** 每个代币的交易金额（lamports） */
  amount: number;
  /** 最小利润阈值（lamports） */
  minProfitLamports: number;
  /** Worker线程数量 */
  workerCount?: number;
  /** 查询间隔（ms） */
  queryIntervalMs?: number;
  /** 滑点容差（基点） */
  slippageBps?: number;
}

/**
 * Worker消息类型
 */
interface WorkerMessage {
  type: 'opportunity' | 'error' | 'stats';
  data: any;
}

/**
 * Jupiter机会发现器
 */
export class OpportunityFinder {
  private config: Required<OpportunityFinderConfig>;
  private workers: Worker[] = [];
  private isRunning = false;
  private stats = {
    queriesTotal: 0,
    opportunitiesFound: 0,
    avgQueryTimeMs: 0,
  };

  constructor(config: OpportunityFinderConfig) {
    this.config = {
      ...config,
      workerCount: config.workerCount || Math.min(os.cpus().length, 8),
      queryIntervalMs: config.queryIntervalMs || 10,
      slippageBps: config.slippageBps || 50,
    };

    logger.info(
      `Opportunity Finder initialized: ${this.config.workerCount} workers, ` +
      `${this.config.mints.length} mints, ` +
      `min profit ${this.config.minProfitLamports} lamports`
    );
  }

  /**
   * 启动机会发现器
   */
  async start(onOpportunity: (opp: ArbitrageOpportunity) => void): Promise<void> {
    if (this.isRunning) {
      logger.warn('Opportunity Finder already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Opportunity Finder...');

    // 将代币列表分配给各个worker
    const mintsPerWorker = Math.ceil(this.config.mints.length / this.config.workerCount);

    for (let i = 0; i < this.config.workerCount; i++) {
      const startIdx = i * mintsPerWorker;
      const endIdx = Math.min(startIdx + mintsPerWorker, this.config.mints.length);
      const workerMints = this.config.mints.slice(startIdx, endIdx);

      if (workerMints.length === 0) continue;

      await this.startWorker(i, workerMints, onOpportunity);
    }

    // 定期输出统计信息
    const statsInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(statsInterval);
        return;
      }

      logger.info(
        `Stats: ${this.stats.queriesTotal} queries, ` +
        `${this.stats.opportunitiesFound} opportunities, ` +
        `avg ${this.stats.avgQueryTimeMs.toFixed(1)}ms per query`
      );
    }, 60000); // 每分钟
  }

  /**
   * 启动单个Worker
   */
  private async startWorker(
    workerId: number,
    mints: PublicKey[],
    onOpportunity: (opp: ArbitrageOpportunity) => void
  ): Promise<void> {
    const workerPath = path.join(__dirname, 'workers', 'query-worker.ts');

    const worker = new Worker(workerPath, {
      workerData: {
        workerId,
        config: {
          jupiterApiUrl: this.config.jupiterApiUrl,
          mints: mints.map(m => m.toBase58()),
          amount: this.config.amount,
          minProfitLamports: this.config.minProfitLamports,
          queryIntervalMs: this.config.queryIntervalMs,
          slippageBps: this.config.slippageBps,
        },
      },
    });

    worker.on('message', (message: WorkerMessage) => {
      switch (message.type) {
        case 'opportunity':
          this.handleOpportunity(message.data, onOpportunity);
          break;
        case 'error':
          logger.error(`Worker ${workerId} error: ${message.data}`);
          break;
        case 'stats':
          this.updateStats(message.data);
          break;
      }
    });

    worker.on('error', (error) => {
      logger.error(`Worker ${workerId} error:`, error);
      // 重启worker
      setTimeout(() => {
        if (this.isRunning) {
          this.startWorker(workerId, mints, onOpportunity);
        }
      }, 5000);
    });

    worker.on('exit', (code) => {
      if (code !== 0 && this.isRunning) {
        logger.warn(`Worker ${workerId} exited with code ${code}, restarting...`);
        setTimeout(() => {
          this.startWorker(workerId, mints, onOpportunity);
        }, 5000);
      }
    });

    this.workers.push(worker);
    logger.info(`Worker ${workerId} started with ${mints.length} mints`);
  }

  /**
   * 处理发现的机会
   */
  private handleOpportunity(
    data: any,
    onOpportunity: (opp: ArbitrageOpportunity) => void
  ): void {
    try {
      const opportunity: ArbitrageOpportunity = {
        inputMint: new PublicKey(data.inputMint),
        outputMint: new PublicKey(data.outputMint),
        inputAmount: data.inputAmount,
        outputAmount: data.outputAmount,
        profit: data.profit,
        roi: data.roi,
        route: data.route,
        timestamp: Date.now(),
      };

      this.stats.opportunitiesFound++;

      logger.info(
        `🎯 Opportunity found: ${opportunity.inputMint.toBase58().slice(0, 8)}... ` +
        `profit ${opportunity.profit} lamports (${opportunity.roi.toFixed(2)}% ROI)`
      );

      onOpportunity(opportunity);
    } catch (error) {
      logger.error('Failed to handle opportunity:', error);
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(data: any): void {
    this.stats.queriesTotal += data.queriesTotal || 0;
    
    // 更新平均查询时间
    if (data.avgQueryTimeMs) {
      this.stats.avgQueryTimeMs = 
        (this.stats.avgQueryTimeMs * 0.9) + (data.avgQueryTimeMs * 0.1);
    }
  }

  /**
   * 停止机会发现器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('Stopping Opportunity Finder...');
    this.isRunning = false;

    // 终止所有worker
    await Promise.all(
      this.workers.map(worker => 
        worker.terminate().catch(err => 
          logger.error('Error terminating worker:', err)
        )
      )
    );

    this.workers = [];
    logger.info('Opportunity Finder stopped');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }
}
