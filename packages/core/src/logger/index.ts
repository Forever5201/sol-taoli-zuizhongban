/**
 * 高性能日志系统
 * 
 * 使用 Pino 提供快速、结构化的日志输出
 */

import pino from 'pino';

/**
 * 创建日志实例
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
    }
  } : undefined,
});

/**
 * 创建子日志器
 * @param name 模块名称
 */
export function createLogger(name: string) {
  return logger.child({ module: name });
}

/**
 * 日志级别
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export default logger;


