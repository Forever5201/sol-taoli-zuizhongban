/**
 * 监控服务
 * 
 * 提供告警和通知功能，支持：
 * - Discord Webhook
 * - 利润通知
 * - 错误告警
 * - 熔断通知
 * - 性能统计
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../logger';
import { ServerChanAdapter, type ServerChanConfig } from './serverchan-adapter';

const logger = createLogger('MonitoringService');

/**
 * 告警类型
 */
export type AlertType = 'success' | 'error' | 'warning' | 'info';

/**
 * 告警级别
 */
export type AlertLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * 告警消息
 */
export interface Alert {
  /** 告警类型 */
  type: AlertType;
  /** 告警级别 */
  level?: AlertLevel;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 附加数据 */
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  /** 时间戳 */
  timestamp?: Date;
}

/**
 * 监控服务配置
 */
export interface MonitoringServiceConfig {
  /** Discord Webhook URL */
  webhookUrl?: string;
  /** 是否启用监控 */
  enabled?: boolean;
  /** 是否在利润时告警 */
  alertOnProfit?: boolean;
  /** 是否在错误时告警 */
  alertOnError?: boolean;
  /** 是否在警告时告警 */
  alertOnWarning?: boolean;
  /** 最小利润告警阈值（lamports） */
  minProfitForAlert?: number;
  /** 告警频率限制（毫秒） */
  rateLimitMs?: number;
  /** 批量发送间隔（毫秒，0 表示立即发送） */
  batchIntervalMs?: number;
  /** 最大批量大小 */
  maxBatchSize?: number;
  /** Server酱配置 */
  serverChan?: ServerChanConfig;
  /** 是否在发现机会时告警 */
  alertOnOpportunityFound?: boolean;
  /** 最小机会利润告警阈值（lamports） */
  minOpportunityProfitForAlert?: number;
  /** 机会告警频率限制（毫秒） */
  opportunityAlertRateLimitMs?: number;
}

/**
 * 监控统计
 */
export interface MonitoringStats {
  /** 总告警数 */
  totalAlerts: number;
  /** 成功通知数 */
  successNotifications: number;
  /** 失败通知数 */
  failedNotifications: number;
  /** 限流跳过数 */
  rateLimitedSkips: number;
  /** 最后通知时间 */
  lastNotificationTime?: Date;
}

/**
 * 监控服务类
 */
export class MonitoringService {
  private config: Required<MonitoringServiceConfig>;
  private axiosInstance: AxiosInstance;
  private lastAlertTime = 0;
  private alertQueue: Alert[] = [];
  private batchTimer?: NodeJS.Timeout;
  private serverChan?: ServerChanAdapter;
  
  private stats: MonitoringStats = {
    totalAlerts: 0,
    successNotifications: 0,
    failedNotifications: 0,
    rateLimitedSkips: 0,
  };

  constructor(config: MonitoringServiceConfig = {}) {
    this.config = {
      webhookUrl: config.webhookUrl || '',
      enabled: config.enabled !== false,
      alertOnProfit: config.alertOnProfit !== false,
      alertOnError: config.alertOnError !== false,
      alertOnWarning: config.alertOnWarning !== false,
      minProfitForAlert: config.minProfitForAlert || 1_000_000, // 0.001 SOL
      rateLimitMs: config.rateLimitMs || 5000, // 5 秒
      batchIntervalMs: config.batchIntervalMs || 0, // 默认立即发送
      maxBatchSize: config.maxBatchSize || 10,
      serverChan: config.serverChan || {
        sendKey: '',
        enabled: false,
      },
      alertOnOpportunityFound: config.alertOnOpportunityFound || false,
      minOpportunityProfitForAlert: config.minOpportunityProfitForAlert || 1_000_000,
      opportunityAlertRateLimitMs: config.opportunityAlertRateLimitMs || 0,
    };

    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 初始化 Server酱
    if (config.serverChan?.sendKey) {
      this.serverChan = new ServerChanAdapter(config.serverChan);
      logger.info('Server酱适配器已启用');
    }

    if (!this.config.enabled) {
      logger.info('Monitoring service disabled');
    } else if (!this.config.webhookUrl && !this.serverChan) {
      logger.warn('Monitoring service enabled but no webhook URL or ServerChan configured');
    } else {
      logger.info('Monitoring service initialized', {
        rateLimitMs: this.config.rateLimitMs,
        batchIntervalMs: this.config.batchIntervalMs,
        hasDiscord: !!this.config.webhookUrl,
        hasServerChan: !!this.serverChan,
      });
    }
  }

  /**
   * 发送通用告警
   */
  async sendAlert(alert: Alert): Promise<boolean> {
    if (!this.config.enabled || !this.config.webhookUrl) {
      return false;
    }

    this.stats.totalAlerts++;

    // 检查频率限制
    const now = Date.now();
    if (now - this.lastAlertTime < this.config.rateLimitMs) {
      this.stats.rateLimitedSkips++;
      logger.debug('Alert rate limited, skipping');
      return false;
    }

    // 如果启用了批量发送
    if (this.config.batchIntervalMs > 0) {
      this.alertQueue.push(alert);
      
      if (this.alertQueue.length >= this.config.maxBatchSize) {
        await this.flushAlertQueue();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.flushAlertQueue();
        }, this.config.batchIntervalMs);
      }
      
      return true;
    }

    // 立即发送
    return await this.sendAlertNow(alert);
  }

  /**
   * 立即发送告警
   */
  private async sendAlertNow(alert: Alert): Promise<boolean> {
    let discordSuccess = false;
    let serverChanSuccess = false;

    // 发送到 Discord
    if (this.config.webhookUrl) {
      const colors: Record<AlertType, number> = {
        success: 0x00FF00,  // 绿色
        error: 0xFF0000,    // 红色
        warning: 0xFFFF00,  // 黄色
        info: 0x3498DB,     // 蓝色
      };

      const embed = {
        title: alert.title,
        description: alert.description,
        color: colors[alert.type],
        fields: alert.fields || [],
        timestamp: (alert.timestamp || new Date()).toISOString(),
        footer: {
          text: `Alert Level: ${alert.level || 'medium'} | Type: ${alert.type}`,
        },
      };

      try {
        await this.axiosInstance.post(this.config.webhookUrl, {
          embeds: [embed],
        });
        discordSuccess = true;
        logger.debug('Discord alert sent', { type: alert.type, title: alert.title });
      } catch (error) {
        logger.error('Discord send failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 发送到 Server酱
    if (this.serverChan) {
      try {
        serverChanSuccess = await this.serverChan.send(alert);
        if (serverChanSuccess) {
          logger.debug('Server酱 alert sent', { type: alert.type, title: alert.title });
        }
      } catch (error) {
        logger.error('Server酱 send failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 只要有一个成功就算成功
    const success = discordSuccess || serverChanSuccess;

    if (success) {
      this.lastAlertTime = Date.now();
      this.stats.successNotifications++;
      this.stats.lastNotificationTime = new Date();
    } else {
      this.stats.failedNotifications++;
    }

    return success;
  }

  /**
   * 刷新告警队列（批量发送）
   */
  private async flushAlertQueue(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.alertQueue.length === 0) {
      return;
    }

    const alerts = this.alertQueue.splice(0, this.config.maxBatchSize);
    
    // 批量发送（合并为一个消息）
    const colors: Record<AlertType, number> = {
      success: 0x00FF00,
      error: 0xFF0000,
      warning: 0xFFFF00,
      info: 0x3498DB,
    };

    const embeds = alerts.map(alert => ({
      title: alert.title,
      description: alert.description,
      color: colors[alert.type],
      fields: alert.fields || [],
      timestamp: (alert.timestamp || new Date()).toISOString(),
    }));

    try {
      await this.axiosInstance.post(this.config.webhookUrl, { embeds });
      this.lastAlertTime = Date.now();
      this.stats.successNotifications += alerts.length;
      this.stats.lastNotificationTime = new Date();
      logger.debug(`Batch sent: ${alerts.length} alerts`);
    } catch (error) {
      this.stats.failedNotifications += alerts.length;
      logger.error('Failed to send batch alerts', {
        error: error instanceof Error ? error.message : String(error),
        count: alerts.length,
      });
    }
  }

  /**
   * 利润通知
   */
  async alertProfit(
    profit: number,
    tx: string,
    details?: {
      roi?: number;
      tip?: number;
      tokenPair?: string;
    }
  ): Promise<boolean> {
    if (!this.config.alertOnProfit || profit < this.config.minProfitForAlert) {
      return false;
    }

    const profitSOL = (profit / 1_000_000_000).toFixed(6);
    const fields: Array<{ name: string; value: string; inline: boolean }> = [
      {
        name: '💰 净利润',
        value: `${profitSOL} SOL`,
        inline: true,
      },
    ];

    if (details?.roi !== undefined) {
      fields.push({
        name: '📈 ROI',
        value: `${details.roi.toFixed(2)}%`,
        inline: true,
      });
    }

    if (details?.tip !== undefined) {
      const tipSOL = (details.tip / 1_000_000_000).toFixed(6);
      fields.push({
        name: '🎯 Jito Tip',
        value: `${tipSOL} SOL`,
        inline: true,
      });
    }

    if (details?.tokenPair) {
      fields.push({
        name: '🔄 交易对',
        value: details.tokenPair,
        inline: true,
      });
    }

    fields.push({
      name: '🔗 交易链接',
      value: `[Solscan](https://solscan.io/tx/${tx})`,
      inline: false,
    });

    return await this.sendAlert({
      type: 'success',
      level: profit > 10_000_000 ? 'high' : 'medium',
      title: '💰 套利成功！',
      description: `成功执行套利交易，净利润 **${profitSOL} SOL**`,
      fields,
    });
  }

  /**
   * 错误告警
   */
  async alertError(
    error: string,
    context?: string,
    details?: Record<string, string>
  ): Promise<boolean> {
    if (!this.config.alertOnError) {
      return false;
    }

    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    if (context) {
      fields.push({
        name: '📍 上下文',
        value: context,
        inline: false,
      });
    }

    if (details) {
      for (const [key, value] of Object.entries(details)) {
        fields.push({
          name: key,
          value: String(value),
          inline: true,
        });
      }
    }

    return await this.sendAlert({
      type: 'error',
      level: 'high',
      title: '❌ 错误发生',
      description: `\`\`\`\n${error}\n\`\`\``,
      fields,
    });
  }

  /**
   * 熔断器告警
   */
  async alertCircuitBreaker(
    reason: string,
    cooldownMs: number,
    stats?: {
      consecutiveFailures?: number;
      successRate?: number;
      netProfit?: number;
    }
  ): Promise<boolean> {
    if (!this.config.alertOnWarning) {
      return false;
    }

    const cooldownSeconds = Math.ceil(cooldownMs / 1000);
    const fields: Array<{ name: string; value: string; inline: boolean }> = [
      {
        name: '⚠️ 原因',
        value: reason,
        inline: false,
      },
      {
        name: '⏳ 冷却时间',
        value: `${cooldownSeconds} 秒`,
        inline: true,
      },
    ];

    if (stats?.consecutiveFailures !== undefined) {
      fields.push({
        name: '🔴 连续失败',
        value: String(stats.consecutiveFailures),
        inline: true,
      });
    }

    if (stats?.successRate !== undefined) {
      fields.push({
        name: '📊 成功率',
        value: `${(stats.successRate * 100).toFixed(1)}%`,
        inline: true,
      });
    }

    if (stats?.netProfit !== undefined) {
      const profitSOL = (stats.netProfit / 1_000_000_000).toFixed(6);
      fields.push({
        name: '💸 净利润',
        value: `${profitSOL} SOL`,
        inline: true,
      });
    }

    return await this.sendAlert({
      type: 'warning',
      level: 'critical',
      title: '🚨 熔断器触发！',
      description: '机器人已自动停止交易以保护资金安全。',
      fields,
    });
  }

  /**
   * 熔断器恢复通知
   */
  async alertCircuitBreakerRecovered(): Promise<boolean> {
    return await this.sendAlert({
      type: 'success',
      level: 'medium',
      title: '✅ 熔断器已恢复',
      description: '系统已通过健康检查，恢复正常运行。',
    });
  }

  /**
   * 性能统计通知
   */
  async alertPerformanceStats(stats: {
    totalTrades?: number;
    successfulTrades?: number;
    successRate?: number;
    totalProfit?: number;
    averageProfit?: number;
    averageTip?: number;
    uptime?: number;
  }): Promise<boolean> {
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    if (stats.totalTrades !== undefined) {
      fields.push({
        name: '📊 总交易数',
        value: String(stats.totalTrades),
        inline: true,
      });
    }

    if (stats.successfulTrades !== undefined) {
      fields.push({
        name: '✅ 成功交易',
        value: String(stats.successfulTrades),
        inline: true,
      });
    }

    if (stats.successRate !== undefined) {
      fields.push({
        name: '📈 成功率',
        value: `${(stats.successRate * 100).toFixed(1)}%`,
        inline: true,
      });
    }

    if (stats.totalProfit !== undefined) {
      const profitSOL = (stats.totalProfit / 1_000_000_000).toFixed(6);
      fields.push({
        name: '💰 总利润',
        value: `${profitSOL} SOL`,
        inline: true,
      });
    }

    if (stats.averageProfit !== undefined) {
      const avgProfitSOL = (stats.averageProfit / 1_000_000_000).toFixed(6);
      fields.push({
        name: '📊 平均利润',
        value: `${avgProfitSOL} SOL`,
        inline: true,
      });
    }

    if (stats.averageTip !== undefined) {
      const avgTipSOL = (stats.averageTip / 1_000_000_000).toFixed(6);
      fields.push({
        name: '🎯 平均 Tip',
        value: `${avgTipSOL} SOL`,
        inline: true,
      });
    }

    if (stats.uptime !== undefined) {
      const uptimeHours = (stats.uptime / 3600000).toFixed(2);
      fields.push({
        name: '⏱️ 运行时长',
        value: `${uptimeHours} 小时`,
        inline: true,
      });
    }

    return await this.sendAlert({
      type: 'info',
      level: 'low',
      title: '📊 性能统计报告',
      description: '机器人运行统计数据',
      fields,
    });
  }

  /**
   * 启动通知
   */
  async alertStartup(config: {
    network?: string;
    capitalSize?: string;
    dryRun?: boolean;
    minProfit?: number;
  }): Promise<boolean> {
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    if (config.network) {
      fields.push({
        name: '🌐 网络',
        value: config.network,
        inline: true,
      });
    }

    if (config.capitalSize) {
      fields.push({
        name: '💼 资金量级',
        value: config.capitalSize,
        inline: true,
      });
    }

    if (config.dryRun !== undefined) {
      fields.push({
        name: '🧪 模式',
        value: config.dryRun ? '测试模式' : '生产模式',
        inline: true,
      });
    }

    if (config.minProfit !== undefined) {
      const minProfitSOL = (config.minProfit / 1_000_000_000).toFixed(6);
      fields.push({
        name: '🎯 最小利润',
        value: `${minProfitSOL} SOL`,
        inline: true,
      });
    }

    return await this.sendAlert({
      type: 'info',
      level: 'medium',
      title: '🚀 机器人已启动',
      description: '套利机器人开始运行',
      fields,
    });
  }

  /**
   * 停止通知
   */
  async alertShutdown(reason?: string): Promise<boolean> {
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    if (reason) {
      fields.push({
        name: '📍 原因',
        value: reason,
        inline: false,
      });
    }

    // 立即刷新队列
    await this.flushAlertQueue();

    return await this.sendAlert({
      type: 'warning',
      level: 'medium',
      title: '🛑 机器人已停止',
      description: '套利机器人已停止运行',
      fields,
    });
  }

  /**
   * 套利机会发现通知
   */
  async alertOpportunityFound(
    opportunity: {
      inputMint: string;
      profit: number;
      roi: number;
      bridgeToken?: string;
      bridgeMint?: string;
      inputAmount: number;
      outputAmount: number;
    }
  ): Promise<boolean> {
    if (!this.config.alertOnOpportunityFound) {
      return false;
    }
    
    if (opportunity.profit < this.config.minOpportunityProfitForAlert) {
      return false;
    }

    // 检查频率限制（针对机会通知的独立限制）
    if (this.config.opportunityAlertRateLimitMs > 0) {
      const now = Date.now();
      if (now - this.lastAlertTime < this.config.opportunityAlertRateLimitMs) {
        return false;
      }
    }

    const profitSOL = (opportunity.profit / 1_000_000_000).toFixed(6);
    const inputSOL = (opportunity.inputAmount / 1_000_000_000).toFixed(4);
    const outputSOL = (opportunity.outputAmount / 1_000_000_000).toFixed(4);
    
    const fields: Array<{ name: string; value: string; inline: boolean }> = [
      { name: '💰 预期利润', value: `${profitSOL} SOL`, inline: true },
      { name: '📈 ROI', value: `${opportunity.roi.toFixed(2)}%`, inline: true },
      { name: '📥 输入金额', value: `${inputSOL} SOL`, inline: true },
      { name: '📤 输出金额', value: `${outputSOL} SOL`, inline: true },
    ];

    if (opportunity.bridgeToken) {
      fields.push({
        name: '🌉 桥接代币',
        value: opportunity.bridgeToken,
        inline: true,
      });
    }

    fields.push({
      name: '🪙 代币地址',
      value: `${opportunity.inputMint.slice(0, 8)}...`,
      inline: true,
    });

    return await this.sendAlert({
      type: 'info',
      level: 'low',
      title: '🔍 发现套利机会',
      description: `检测到潜在套利机会，预期利润 **${profitSOL} SOL**`,
      fields,
    });
  }

  /**
   * 获取统计信息
   */
  getStats(): MonitoringStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalAlerts: 0,
      successNotifications: 0,
      failedNotifications: 0,
      rateLimitedSkips: 0,
    };
    logger.info('Monitoring stats reset');
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 刷新剩余的告警队列
    await this.flushAlertQueue();
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    logger.info('Monitoring service cleaned up');
  }
}

