"use strict";
/**
 * 配置加载器
 *
 * 负责加载和解析 TOML 配置文件，支持变量替换
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = void 0;
const toml_1 = __importDefault(require("toml"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../logger");
const configLogger = logger_1.logger.child({ module: 'ConfigLoader' });
/**
 * 配置加载器类
 */
class ConfigLoader {
    static globalConfig = null;
    /**
     * 加载全局配置
     * @param configPath 配置文件路径
     * @returns 全局配置对象
     */
    static loadGlobalConfig(configPath = 'configs/global.toml') {
        if (this.globalConfig) {
            return this.globalConfig;
        }
        try {
            const absolutePath = path_1.default.resolve(configPath);
            if (!fs_1.default.existsSync(absolutePath)) {
                throw new Error(`Global config file not found: ${absolutePath}`);
            }
            const content = fs_1.default.readFileSync(absolutePath, 'utf-8');
            this.globalConfig = toml_1.default.parse(content);
            configLogger.info(`Global config loaded from ${absolutePath}`);
            return this.globalConfig;
        }
        catch (error) {
            configLogger.error(`Failed to load global config: ${error}`);
            throw error;
        }
    }
    /**
     * 加载模块配置
     * @param configPath 模块配置文件路径
     * @returns 解析后的配置对象
     */
    static loadModuleConfig(configPath) {
        try {
            const absolutePath = path_1.default.resolve(configPath);
            if (!fs_1.default.existsSync(absolutePath)) {
                throw new Error(`Config file not found: ${absolutePath}`);
            }
            let content = fs_1.default.readFileSync(absolutePath, 'utf-8');
            // 变量替换
            content = this.replaceVariables(content);
            const config = toml_1.default.parse(content);
            configLogger.info(`Module config loaded from ${absolutePath}`);
            return config;
        }
        catch (error) {
            configLogger.error(`Failed to load module config: ${error}`);
            throw error;
        }
    }
    /**
     * 变量替换
     * 将配置中的 ${VAR} 替换为 global.toml 中定义的值
     * @param content 配置文件内容
     * @returns 替换后的内容
     */
    static replaceVariables(content) {
        if (!this.globalConfig) {
            // 尝试加载全局配置
            try {
                this.loadGlobalConfig();
            }
            catch (error) {
                configLogger.warn('Global config not loaded, variable replacement skipped');
                return content;
            }
        }
        return content.replace(/\$\{(\w+)\}/g, (match, varName) => {
            const value = this.globalConfig?.global?.[varName];
            if (value !== undefined) {
                return value;
            }
            configLogger.warn(`Variable ${varName} not found in global config`);
            return match;
        });
    }
    /**
     * 验证配置
     * @param config 配置对象
     * @param requiredFields 必需字段列表
     * @returns 验证结果
     */
    static validateConfig(config, requiredFields = []) {
        const errors = [];
        // 检查必需字段
        for (const field of requiredFields) {
            if (!this.hasNestedProperty(config, field)) {
                errors.push(`Missing required field: ${field}`);
            }
        }
        // 检查安全确认
        if (config.security && config.security.acknowledge_terms_of_service === false) {
            errors.push('You must acknowledge terms of service before running');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * 检查嵌套属性是否存在
     * @param obj 对象
     * @param path 属性路径（如 "global.DEFAULT_RPC_URL"）
     * @returns 是否存在
     */
    static hasNestedProperty(obj, path) {
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            }
            else {
                return false;
            }
        }
        return current !== undefined;
    }
    /**
     * 获取已加载的全局配置
     * @returns 全局配置或 null
     */
    static getGlobalConfig() {
        return this.globalConfig;
    }
    /**
     * 重置缓存的全局配置
     */
    static resetGlobalConfig() {
        this.globalConfig = null;
    }
}
exports.ConfigLoader = ConfigLoader;
exports.default = ConfigLoader;
//# sourceMappingURL=loader.js.map