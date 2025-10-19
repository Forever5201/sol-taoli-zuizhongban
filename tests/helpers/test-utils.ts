/**
 * 测试工具函数
 * 提供通用的测试辅助功能
 */

import { PublicKey, Connection } from '@solana/web3.js';

/**
 * 等待指定时间
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 创建 Mock Connection
 */
export function createMockConnection(): jest.Mocked<Connection> {
  return {
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 100000,
    }),
    getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL
    getAccountInfo: jest.fn().mockResolvedValue(null),
    sendTransaction: jest.fn().mockResolvedValue('mock-signature'),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    getSignatureStatus: jest.fn().mockResolvedValue({ value: { err: null } }),
  } as any;
}

/**
 * 生成随机 PublicKey
 */
export function generateRandomPublicKey(): PublicKey {
  return PublicKey.unique();
}

/**
 * 断言数字在范围内
 */
export function assertNumberInRange(
  value: number,
  min: number,
  max: number,
  message?: string
): void {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
  if (message) {
    expect(value >= min && value <= max).toBe(true);
  }
}

/**
 * 断言数字接近（允许误差）
 */
export function assertNumberClose(
  actual: number,
  expected: number,
  tolerance: number = 0.01,
  message?: string
): void {
  const diff = Math.abs(actual - expected);
  const maxDiff = Math.abs(expected * tolerance);
  expect(diff).toBeLessThanOrEqual(maxDiff);
  if (message) {
    console.log(`${message}: actual=${actual}, expected=${expected}, diff=${diff}`);
  }
}

/**
 * Mock Fetch API
 */
export function mockFetch(response: any, status: number = 200): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  } as any);
}

/**
 * Mock WebSocket
 */
export class MockWebSocket {
  public onopen: (() => void) | null = null;
  public onmessage: ((event: any) => void) | null = null;
  public onerror: ((error: any) => void) | null = null;
  public onclose: (() => void) | null = null;
  public readyState: number = 0;

  constructor(public url: string) {
    // 模拟异步连接
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data: string): void {
    // Mock send
  }

  close(): void {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }

  // 测试辅助：触发消息
  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // 测试辅助：触发错误
  simulateError(error: any): void {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

/**
 * 创建测试用的 Keypair 数据
 */
export function createMockKeypairData(): number[] {
  // 使用一个已知有效的Solana测试密钥
  // 这是从devnet-test-wallet.json派生的测试密钥
  return [
    71,77,168,81,254,176,178,217,106,37,142,199,111,190,233,168,
    38,24,138,50,222,23,113,236,54,138,171,198,205,227,208,85,
    212,221,212,148,205,246,23,172,195,155,111,59,59,95,41,146,
    147,202,107,168,229,237,104,139,61,95,212,235,105,132,143
  ];
}

/**
 * 测试环境检测
 */
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
}

/**
 * 跳过集成测试（如果没有配置环境）
 */
export function skipWithoutEnv(envVar: string): void {
  if (!process.env[envVar]) {
    console.warn(`Skipping test: ${envVar} not set`);
    return;
  }
}

/**
 * 时间测量
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

/**
 * 创建临时测试配置
 */
export function createTestConfig(overrides: Record<string, any> = {}): any {
  return {
    testMode: true,
    logLevel: 'error',
    ...overrides,
  };
}
