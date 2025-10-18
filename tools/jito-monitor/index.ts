#!/usr/bin/env tsx
/**
 * Jito 小费监控器
 * 
 * 实时监控 Jito 小费市场，通过 WebSocket 流式接收数据
 */

import WebSocket from 'ws';
import { JitoTipOptimizer, formatLamportsToSOL, LAMPORTS_PER_SOL } from '../../packages/core/src/economics';

interface TipStreamData {
  time: string;
  landed_tips_25th_percentile: number;
  landed_tips_50th_percentile: number;
  landed_tips_75th_percentile: number;
  landed_tips_95th_percentile: number;
  landed_tips_99th_percentile: number;
  ema_landed_tips_50th_percentile: number;
}

class JitoMonitor {
  private static readonly WS_URL = 'wss://bundles.jito.wtf/api/v1/bundles/tip_stream';
  private static readonly REST_URL = 'https://bundles.jito.wtf/api/v1/bundles/tip_floor';

  private optimizer: JitoTipOptimizer;
  private history: TipStreamData[] = [];
  private maxHistorySize = 100;
  
  constructor() {
    this.optimizer = new JitoTipOptimizer();
  }

  /**
   * 启动监控
   */
  async start() {
    console.log('🎯 ========== Jito 小费监控器 ==========\n');
    console.log('📡 连接到 Jito Bundle API...\n');

    // 首先获取当前数据
    await this.fetchCurrentData();

    // 然后启动 WebSocket 流
    this.startWebSocketStream();
  }

  /**
   * 获取当前数据（REST API）
   */
  private async fetchCurrentData() {
    try {
      const tipData = await this.optimizer.fetchRealtimeTipFloor(true);
      this.displayTipData(tipData);
    } catch (error) {
      console.error('❌ 获取数据失败:', error);
    }
  }

  /**
   * 启动 WebSocket 流
   */
  private startWebSocketStream() {
    console.log('\n🔄 启动实时数据流...\n');
    console.log('按 Ctrl+C 停止监控\n');
    console.log('----------------------------------------');

    const ws = new WebSocket(JitoMonitor.WS_URL);

    ws.on('open', () => {
      console.log('✅ WebSocket 连接已建立');
      console.log('📊 实时接收小费数据中...\n');
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const tipData: TipStreamData = JSON.parse(data.toString());
        this.history.push(tipData);

        // 限制历史大小
        if (this.history.length > this.maxHistorySize) {
          this.history.shift();
        }

        this.displayTipUpdate(tipData);
      } catch (error) {
        console.error('❌ 解析数据失败:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket 错误:', error);
    });

    ws.on('close', () => {
      console.log('\n⚠️  WebSocket 连接已关闭，5 秒后重连...');
      setTimeout(() => this.startWebSocketStream(), 5000);
    });
  }

  /**
   * 显示小费数据
   */
  private displayTipData(data: TipStreamData) {
    const time = new Date(data.time).toLocaleTimeString('zh-CN');

    console.log(`\n⏰ 更新时间: ${time}`);
    console.log('\n当前小费市场 (SOL):');
    console.log('  ┌─────────────┬──────────────┬──────────────┐');
    console.log('  │  百分位     │  SOL         │  Lamports    │');
    console.log('  ├─────────────┼──────────────┼──────────────┤');

    const percentiles = [
      { label: '25th', value: data.landed_tips_25th_percentile },
      { label: '50th', value: data.landed_tips_50th_percentile },
      { label: '75th', value: data.landed_tips_75th_percentile },
      { label: '95th', value: data.landed_tips_95th_percentile },
      { label: '99th', value: data.landed_tips_99th_percentile },
    ];

    percentiles.forEach(({ label, value }) => {
      const sol = value.toFixed(9).padStart(12);
      const lamports = Math.ceil(value * LAMPORTS_PER_SOL).toString().padStart(12);
      console.log(`  │  ${label.padEnd(10)} │ ${sol} │ ${lamports} │`);
    });

    console.log('  └─────────────┴──────────────┴──────────────┘');

    console.log(`\n  EMA 50th: ${data.ema_landed_tips_50th_percentile.toFixed(9)} SOL`);
  }

  /**
   * 显示小费更新（简化版）
   */
  private displayTipUpdate(data: TipStreamData) {
    const time = new Date(data.time).toLocaleTimeString('zh-CN');
    const tip50th = data.landed_tips_50th_percentile.toFixed(9);
    const tip95th = data.landed_tips_95th_percentile.toFixed(9);

    // 计算变化（与历史比较）
    if (this.history.length > 1) {
      const prev = this.history[this.history.length - 2];
      const change50 = ((data.landed_tips_50th_percentile / prev.landed_tips_50th_percentile - 1) * 100);
      const change95 = ((data.landed_tips_95th_percentile / prev.landed_tips_95th_percentile - 1) * 100);

      const arrow50 = change50 > 0 ? '↑' : change50 < 0 ? '↓' : '→';
      const arrow95 = change95 > 0 ? '↑' : change95 < 0 ? '↓' : '→';

      console.log(
        `[${time}] 50th: ${tip50th} SOL ${arrow50} (${change50.toFixed(1)}%) | 95th: ${tip95th} SOL ${arrow95} (${change95.toFixed(1)}%)`
      );
    } else {
      console.log(`[${time}] 50th: ${tip50th} SOL | 95th: ${tip95th} SOL`);
    }
  }

  /**
   * 显示统计摘要
   */
  getStatistics() {
    if (this.history.length === 0) {
      console.log('暂无历史数据');
      return;
    }

    const tips50th = this.history.map((d) => d.landed_tips_50th_percentile);
    const tips95th = this.history.map((d) => d.landed_tips_95th_percentile);

    const avg50 = tips50th.reduce((a, b) => a + b, 0) / tips50th.length;
    const min50 = Math.min(...tips50th);
    const max50 = Math.max(...tips50th);

    const avg95 = tips95th.reduce((a, b) => a + b, 0) / tips95th.length;
    const min95 = Math.min(...tips95th);
    const max95 = Math.max(...tips95th);

    console.log('\n📈 统计摘要（基于最近 ' + this.history.length + ' 个数据点）:');
    console.log('\n  50th 百分位:');
    console.log(`    平均: ${avg50.toFixed(9)} SOL`);
    console.log(`    最低: ${min50.toFixed(9)} SOL`);
    console.log(`    最高: ${max50.toFixed(9)} SOL`);
    console.log('\n  95th 百分位:');
    console.log(`    平均: ${avg95.toFixed(9)} SOL`);
    console.log(`    最低: ${min95.toFixed(9)} SOL`);
    console.log(`    最高: ${max95.toFixed(9)} SOL`);
  }
}

// CLI 参数解析
async function main() {
  const monitor = new JitoMonitor();

  // 处理退出信号
  process.on('SIGINT', () => {
    console.log('\n\n⏹️  正在停止监控...');
    monitor.getStatistics();
    console.log('\n✅ 监控已停止\n');
    process.exit(0);
  });

  // 启动监控
  await monitor.start();

  // 定期显示统计（每 5 分钟）
  setInterval(() => {
    monitor.getStatistics();
  }, 5 * 60 * 1000);
}

// 执行
main().catch((error) => {
  console.error('❌ 监控失败:', error);
  process.exit(1);
});



