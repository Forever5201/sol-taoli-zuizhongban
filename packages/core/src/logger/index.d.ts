/**
 * 高性能日志系统
 *
 * 使用 Pino 提供快速、结构化的日志输出
 */
import pino from 'pino';
/**
 * 创建日志实例
 */
export declare const logger: import("pino").Logger<never>;
/**
 * 创建子日志器
 * @param name 模块名称
 */
export declare function createLogger(name: string): pino.Logger<never>;
/**
 * 日志级别
 */
export declare enum LogLevel {
    TRACE = "trace",
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
    FATAL = "fatal"
}
export default logger;
//# sourceMappingURL=index.d.ts.map