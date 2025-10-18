/**
 * 任务加载器
 * 
 * 动态加载和运行不同的任务模块
 * 实现设计文档2.1节要求的任务分发
 */

import { resolve } from 'path';

/**
 * 任务接口
 */
export interface Task {
  name: string;
  start(config: any): Promise<void>;
  stop(): Promise<void>;
}

/**
 * 任务注册表
 */
const taskRegistry: Map<string, () => Promise<Task>> = new Map();

/**
 * 注册任务
 */
export function registerTask(name: string, loader: () => Promise<Task>): void {
  taskRegistry.set(name, loader);
}

/**
 * 加载任务
 */
export async function loadTask(taskName: string): Promise<Task> {
  const loader = taskRegistry.get(taskName);
  
  if (!loader) {
    throw new Error(`Unknown task: ${taskName}`);
  }

  try {
    return await loader();
  } catch (error: any) {
    throw new Error(`Failed to load task ${taskName}: ${error.message}`);
  }
}

/**
 * 获取所有可用任务
 */
export function getAvailableTasks(): string[] {
  return Array.from(taskRegistry.keys());
}

// ========================================
// 预注册任务
// ========================================

/**
 * Jupiter Bot任务
 */
registerTask('jupiter-bot', async () => {
  const { JupiterBot } = await import('../../jupiter-bot/src/index');
  
  return {
    name: 'jupiter-bot',
    instance: null as any,
    
    async start(config: any) {
      console.log('🤖 Starting Jupiter Bot...');
      this.instance = new JupiterBot(config);
      await this.instance.start();
    },
    
    async stop() {
      if (this.instance) {
        console.log('🛑 Stopping Jupiter Bot...');
        await this.instance.stop();
      }
    },
  };
});

/**
 * OnChain Bot任务
 */
registerTask('onchain-bot', async () => {
  const { OnChainBot } = await import('../../onchain-bot/src/index');
  
  return {
    name: 'onchain-bot',
    instance: null as any,
    
    async start(config: any) {
      console.log('⛓️  Starting OnChain Bot...');
      this.instance = new OnChainBot(config);
      await this.instance.start();
    },
    
    async stop() {
      if (this.instance) {
        console.log('🛑 Stopping OnChain Bot...');
        await this.instance.stop();
      }
    },
  };
});

/**
 * Jupiter Server任务
 */
registerTask('jupiter-server', async () => {
  return {
    name: 'jupiter-server',
    process: null as any,
    
    async start(config: any) {
      console.log('🌟 Starting Jupiter Server...');
      // TODO: 实现Jupiter Server管理
      console.log('⚠️  Jupiter Server管理器尚未实现');
      console.log('   请手动启动 jupiter-cli');
    },
    
    async stop() {
      console.log('🛑 Stopping Jupiter Server...');
    },
  };
});

/**
 * Tools任务（交互式工具集）
 */
registerTask('tools', async () => {
  return {
    name: 'tools',
    
    async start(config: any) {
      console.log('🛠️  Starting Interactive Tools...');
      console.log('⚠️  工具集尚未实现');
      // TODO: 实现交互式工具菜单
    },
    
    async stop() {
      console.log('🛑 Stopping Tools...');
    },
  };
});
