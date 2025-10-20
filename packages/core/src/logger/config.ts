/**
 * 日志配置
 * 
 * 提供灵活的日志配置选项，支持：
 * - 控制台输出（美化）
 * - 文件输出（JSON）
 * - 日志级别控制
 * - 生产/开发模式
 */

import pino from 'pino';
import path from 'path';
import fs from 'fs';

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  /** 日志级别 */
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  /** 是否美化输出 */
  prettyPrint?: boolean;
  /** 是否输出到文件 */
  fileOutput?: boolean;
  /** 文件输出目录 */
  logDir?: string;
  /** 日志文件名 */
  logFileName?: string;
  /** 是否输出到控制台 */
  consoleOutput?: boolean;
  /** 是否包含时间戳 */
  timestamp?: boolean;
  /** 是否包含 pid 和 hostname */
  includeMetadata?: boolean;
  /** 生产模式 */
  production?: boolean;
}

/**
 * 创建增强的日志实例
 */
export function createEnhancedLogger(config: LoggerConfig = {}) {
  const {
    level = process.env.LOG_LEVEL || 'info',
    prettyPrint = process.env.NODE_ENV !== 'production',
    fileOutput = true,
    logDir = './logs',
    logFileName = 'bot.log',
    consoleOutput = true,
    timestamp = true,
    includeMetadata = false,
    production = process.env.NODE_ENV === 'production',
  } = config;

  // 确保日志目录存在
  if (fileOutput && !fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = fileOutput ? path.join(logDir, logFileName) : undefined;

  // 构建传输配置
  const targets: pino.TransportTargetOptions[] = [];

  // 控制台输出（美化）
  if (consoleOutput && prettyPrint) {
    targets.push({
      target: 'pino-pretty',
      level: level as pino.Level,
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: includeMetadata ? '' : 'pid,hostname',
        singleLine: false,
        levelFirst: false,
        messageFormat: '{module} - {msg}',
      },
    });
  } else if (consoleOutput) {
    // 生产模式：JSON 输出到控制台
    targets.push({
      target: 'pino/file',
      level: level as pino.Level,
      options: {
        destination: 1, // stdout
      },
    });
  }

  // 文件输出（JSON）
  if (fileOutput && logFile) {
    targets.push({
      target: 'pino/file',
      level: level as pino.Level,
      options: {
        destination: logFile,
        mkdir: true,
      },
    });
  }

  // 创建 pino 实例
  const logger = pino({
    level: level as pino.Level,
    timestamp: timestamp ? pino.stdTimeFunctions.isoTime : false,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    transport: targets.length > 0 ? {
      targets,
    } : undefined,
  });

  return logger;
}

/**
 * 创建带日志轮转的文件日志
 * 需要安装: pnpm add pino-roll
 */
export function createRotatingFileLogger(config: LoggerConfig & {
  /** 日志文件最大大小（字节） */
  maxSize?: number;
  /** 保留的日志文件数量 */
  maxFiles?: number;
  /** 轮转频率 */
  frequency?: 'daily' | 'hourly';
} = {}) {
  const {
    level = 'info',
    logDir = './logs',
    logFileName = 'bot.log',
    maxSize = 10 * 1024 * 1024, // 10MB
    maxFiles = 7, // 保留 7 天
    frequency = 'daily',
  } = config;

  // 确保日志目录存在
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, logFileName);

  const logger = pino({
    level: level as pino.Level,
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: {
      targets: [
        // 控制台输出（美化）
        {
          target: 'pino-pretty',
          level: level as pino.Level,
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
        // 文件输出（带轮转）
        {
          target: 'pino-roll',
          level: level as pino.Level,
          options: {
            file: logFile,
            frequency,
            size: maxSize,
            limit: {
              count: maxFiles,
            },
          },
        },
      ],
    },
  });

  return logger;
}

/**
 * 默认日志配置（开发环境）
 */
export const defaultDevelopmentConfig: LoggerConfig = {
  level: 'debug',
  prettyPrint: true,
  fileOutput: true,
  logDir: './logs',
  logFileName: 'dev.log',
  consoleOutput: true,
  timestamp: true,
  includeMetadata: false,
  production: false,
};

/**
 * 默认日志配置（生产环境）
 */
export const defaultProductionConfig: LoggerConfig = {
  level: 'info',
  prettyPrint: false,
  fileOutput: true,
  logDir: './logs',
  logFileName: 'production.log',
  consoleOutput: true,
  timestamp: true,
  includeMetadata: true,
  production: true,
};

/**
 * 默认日志配置（测试环境）
 */
export const defaultTestConfig: LoggerConfig = {
  level: 'warn',
  prettyPrint: false,
  fileOutput: false,
  consoleOutput: false,
  production: false,
};

/**
 * 根据环境自动选择配置
 */
export function getDefaultConfig(): LoggerConfig {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'production':
      return defaultProductionConfig;
    case 'test':
      return defaultTestConfig;
    case 'development':
    default:
      return defaultDevelopmentConfig;
  }
}

