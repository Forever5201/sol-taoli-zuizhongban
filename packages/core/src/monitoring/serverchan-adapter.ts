/**
 * Server酱（ServerChan）适配器
 * 
 * 将告警推送到个人微信
 * 官网：https://sct.ftqq.com/
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../logger';
import type { Alert, AlertType } from './service';

const logger = createLogger('ServerChan');

/**
 * Server酱配置
 */
export interface ServerChanConfig {
  /** SendKey（从 Server酱官网获取） */
  sendKey: string;
  /** API 基础 URL */
  apiUrl?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * Server酱适配器
 */
export class ServerChanAdapter {
  private static readonly DEFAULT_API_URL = 'https://sctapi.ftqq.com';
  private axiosInstance: AxiosInstance;
  private config: Required<ServerChanConfig>;

  constructor(config: ServerChanConfig) {
    this.config = {
      sendKey: config.sendKey,
      apiUrl: config.apiUrl || ServerChanAdapter.DEFAULT_API_URL,
      timeout: config.timeout || 10000,
      enabled: config.enabled !== false,
    };

    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.config.enabled) {
      logger.info('Server酱适配器已初始化');
    }
  }

  /**
   * 发送消息到微信
   */
  async send(alert: Alert): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const { title, content } = this.formatMessage(alert);
      
      const url = `${this.config.apiUrl}/${this.config.sendKey}.send`;
      
      const response = await this.axiosInstance.post(url, {
        title,
        desp: content,
      });

      if (response.data.code === 0) {
        logger.debug('Server酱消息发送成功', { title });
        return true;
      } else {
        logger.error('Server酱返回错误', { 
          code: response.data.code,
          message: response.data.message,
        });
        return false;
      }
    } catch (error) {
      logger.error('Server酱发送失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 格式化消息为 Server酱格式
   */
  private formatMessage(alert: Alert): { title: string; content: string } {
    // 标题
    const emoji = this.getEmoji(alert.type);
    const title = `${emoji} ${alert.title}`;

    // 内容（使用 Markdown 格式）
    const lines: string[] = [];
    
    // 描述
    lines.push(alert.description);
    lines.push('');
    
    // 字段
    if (alert.fields && alert.fields.length > 0) {
      lines.push('---');
      lines.push('');
      for (const field of alert.fields) {
        lines.push(`**${field.name}**: ${field.value}`);
        lines.push('');
      }
    }

    // 时间和级别
    lines.push('---');
    lines.push('');
    lines.push(`**时间**: ${(alert.timestamp || new Date()).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    if (alert.level) {
      lines.push(`**级别**: ${this.getLevelText(alert.level)}`);
    }

    const content = lines.join('\n');

    return { title, content };
  }

  /**
   * 获取对应类型的 Emoji
   */
  private getEmoji(type: AlertType): string {
    const emojiMap: Record<AlertType, string> = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return emojiMap[type] || 'ℹ️';
  }

  /**
   * 获取级别文本
   */
  private getLevelText(level: string): string {
    const levelMap: Record<string, string> = {
      critical: '🔴 严重',
      high: '🟠 高',
      medium: '🟡 中',
      low: '🟢 低',
    };
    return levelMap[level] || level;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.axiosInstance.post(
        `${this.config.apiUrl}/${this.config.sendKey}.send`,
        {
          title: '测试通知',
          desp: '这是一条测试消息，如果您收到了这条消息，说明 Server酱配置成功！\n\n**时间**: ' + new Date().toLocaleString('zh-CN'),
        }
      );

      if (response.data.code === 0) {
        return {
          success: true,
          message: 'Server酱连接测试成功！请查看您的微信"服务通知"',
        };
      } else {
        return {
          success: false,
          message: `Server酱返回错误: ${response.data.message}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 快速发送文本消息
   */
  async sendText(title: string, content: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const url = `${this.config.apiUrl}/${this.config.sendKey}.send`;
      
      const response = await this.axiosInstance.post(url, {
        title,
        desp: content,
      });

      return response.data.code === 0;
    } catch (error) {
      logger.error('发送文本消息失败', { error });
      return false;
    }
  }

  /**
   * 检查配置是否有效
   */
  isConfigValid(): boolean {
    return this.config.enabled && this.config.sendKey.length > 0;
  }
}

