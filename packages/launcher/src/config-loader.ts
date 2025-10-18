/**
 * 配置加载器
 * 
 * 支持TOML解析和变量替换
 * 实现设计文档2.1节要求的配置子系统
 */

import { readFileSync } from 'fs';
import { parse } from '@iarna/toml';
import { resolve } from 'path';

/**
 * 全局配置缓存
 */
let globalConfig: any = null;

/**
 * 加载全局配置
 */
export function loadGlobalConfig(configPath?: string): any {
  if (globalConfig) return globalConfig;

  const path = configPath || resolve(process.cwd(), 'configs/global.toml');
  
  try {
    const content = readFileSync(path, 'utf-8');
    globalConfig = parse(content);
    return globalConfig;
  } catch (error: any) {
    throw new Error(`Failed to load global config from ${path}: ${error.message}`);
  }
}

/**
 * 变量替换
 * 
 * 将 ${VAR_NAME} 替换为global.toml中的值
 * 
 * 示例：
 * 输入: "${DEFAULT_KEYPAIR_PATH}"
 * 输出: "./keypairs/wallet.json"
 */
export function replaceVariables(content: string, globals: any): string {
  const variableRegex = /\$\{([A-Z_]+)\}/g;
  
  return content.replace(variableRegex, (match, varName) => {
    // 在global配置中查找变量
    if (globals.global && globals.global[varName] !== undefined) {
      return String(globals.global[varName]);
    }
    
    // 如果找不到，保持原样
    console.warn(`Variable ${varName} not found in global config`);
    return match;
  });
}

/**
 * 加载配置文件
 * 
 * 自动进行变量替换
 */
export function loadConfig<T = any>(configPath: string): T {
  try {
    // 1. 加载全局配置
    const globals = loadGlobalConfig();
    
    // 2. 读取目标配置文件
    const fullPath = resolve(process.cwd(), configPath);
    let content = readFileSync(fullPath, 'utf-8');
    
    // 3. 变量替换
    content = replaceVariables(content, globals);
    
    // 4. 解析TOML
    const config = parse(content) as T;
    
    return config;
  } catch (error: any) {
    throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
  }
}

/**
 * 验证配置合法性
 */
export function validateConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查风险确认
  if (config.security?.acknowledge_terms_of_service === false) {
    errors.push(
      '⚠️  You must set acknowledge_terms_of_service = true in your config file.\n' +
      '   Please read the risks and terms before running the bot.'
    );
  }

  // 检查必需字段
  if (config.wallet?.keypair_path) {
    const fs = require('fs');
    if (!fs.existsSync(config.wallet.keypair_path)) {
      errors.push(`Keypair file not found: ${config.wallet.keypair_path}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取全局变量值
 */
export function getGlobalVar(varName: string): any {
  const globals = loadGlobalConfig();
  return globals.global?.[varName];
}
