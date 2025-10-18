/**
 * LUT (Address Lookup Table) 管理模块
 * 
 * 提供完整的LUT创建、管理和使用功能
 */

export * from './manager';
export * from './presets';

// 便捷导出
export { LUTManager } from './manager';
export { LUT_PRESETS, getPreset, createCustomPreset, mergePresets } from './presets';
export type { LUTConfig, CreateLUTResult, ExtendLUTResult } from './manager';
export type { LUTPreset } from './presets';
