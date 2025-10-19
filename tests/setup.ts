/**
 * 测试全局设置文件
 * 配置测试环境和全局 mock
 */

// 扩展 Jest 匹配器超时
jest.setTimeout(30000);

// 全局测试前置
beforeAll(() => {
  // 设置环境变量
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // 测试时减少日志输出
});

// 全局测试后置
afterAll(() => {
  // 清理
});

// Mock console 方法以减少测试输出
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

export {};
