/**
 * LUT预设模板
 * 
 * 包含常用的DEX和协议账户地址
 * 用于快速创建套利机器人的LUT
 */

import { PublicKey } from '@solana/web3.js';

/**
 * 代币Mint地址
 */
export const TOKEN_MINTS = {
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  USDT: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
  ETH: new PublicKey('7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs'),
  WBTC: new PublicKey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E'),
  JUP: new PublicKey('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'),
  RAY: new PublicKey('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'),
  BONK: new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),
};

/**
 * Raydium程序和账户
 */
export const RAYDIUM_ACCOUNTS = [
  // Raydium AMM程序ID
  new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
  // Raydium Serum程序ID
  new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
  // Raydium权限
  new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'),
];

/**
 * Orca程序和账户
 */
export const ORCA_ACCOUNTS = [
  // Orca Whirlpool程序
  new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),
  // Orca Token Swap程序
  new PublicKey('9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP'),
];

/**
 * Jupiter程序和账户
 */
export const JUPITER_ACCOUNTS = [
  // Jupiter v6程序
  new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
  // Jupiter v4程序（兼容）
  new PublicKey('JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB'),
];

/**
 * Solend闪电贷账户
 */
export const SOLEND_ACCOUNTS = [
  // Solend程序ID
  new PublicKey('So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'),
  // 主市场
  new PublicKey('4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY'),
  // USDC储备
  new PublicKey('BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw'),
  // SOL储备
  new PublicKey('8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36'),
];

/**
 * 系统程序
 */
export const SYSTEM_PROGRAMS = [
  // Token程序
  new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  // Token 2022程序
  new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
  // Associated Token程序
  new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
  // 系统程序
  new PublicKey('11111111111111111111111111111111'),
  // Rent Sysvar
  new PublicKey('SysvarRent111111111111111111111111111111111'),
  // Clock Sysvar
  new PublicKey('SysvarC1ock11111111111111111111111111111111'),
];

/**
 * LUT预设配置
 */
export interface LUTPreset {
  name: string;
  description: string;
  addresses: PublicKey[];
}

/**
 * 套利机器人基础LUT
 * 
 * 包含最常用的账户，适合大多数套利场景
 */
export const ARBITRAGE_BASE_PRESET: LUTPreset = {
  name: 'Arbitrage Base',
  description: '套利机器人基础账户集合',
  addresses: [
    // 代币Mints
    ...Object.values(TOKEN_MINTS),
    // 系统程序
    ...SYSTEM_PROGRAMS,
    // Raydium
    ...RAYDIUM_ACCOUNTS,
    // Orca
    ...ORCA_ACCOUNTS,
    // Jupiter
    ...JUPITER_ACCOUNTS,
  ],
};

/**
 * 闪电贷套利LUT
 * 
 * 包含闪电贷相关账户
 */
export const FLASHLOAN_ARBITRAGE_PRESET: LUTPreset = {
  name: 'Flash Loan Arbitrage',
  description: '闪电贷套利账户集合',
  addresses: [
    ...ARBITRAGE_BASE_PRESET.addresses,
    ...SOLEND_ACCOUNTS,
  ],
};

/**
 * Jupiter专用LUT
 * 
 * 仅包含Jupiter相关账户
 */
export const JUPITER_ONLY_PRESET: LUTPreset = {
  name: 'Jupiter Only',
  description: 'Jupiter聚合器专用',
  addresses: [
    ...Object.values(TOKEN_MINTS),
    ...SYSTEM_PROGRAMS,
    ...JUPITER_ACCOUNTS,
  ],
};

/**
 * 所有预设
 */
export const LUT_PRESETS = {
  ARBITRAGE_BASE: ARBITRAGE_BASE_PRESET,
  FLASHLOAN_ARBITRAGE: FLASHLOAN_ARBITRAGE_PRESET,
  JUPITER_ONLY: JUPITER_ONLY_PRESET,
};

/**
 * 获取预设
 */
export function getPreset(name: keyof typeof LUT_PRESETS): LUTPreset {
  return LUT_PRESETS[name];
}

/**
 * 创建自定义预设
 */
export function createCustomPreset(
  name: string,
  description: string,
  addresses: PublicKey[]
): LUTPreset {
  return {
    name,
    description,
    addresses,
  };
}

/**
 * 合并多个预设
 */
export function mergePresets(...presets: LUTPreset[]): LUTPreset {
  const allAddresses = new Set<string>();
  
  for (const preset of presets) {
    for (const addr of preset.addresses) {
      allAddresses.add(addr.toBase58());
    }
  }

  return {
    name: 'Merged Preset',
    description: `合并了 ${presets.length} 个预设`,
    addresses: Array.from(allAddresses).map(addr => new PublicKey(addr)),
  };
}
