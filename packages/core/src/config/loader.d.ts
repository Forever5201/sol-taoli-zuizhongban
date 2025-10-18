/**
 * 配置加载器
 *
 * 负责加载和解析 TOML 配置文件，支持变量替换
 */
/**
 * 全局配置接口
 */
export interface GlobalConfig {
    global: {
        DEFAULT_RPC_URL: string;
        DEFAULT_KEYPAIR_PATH: string;
        JITO_BLOCK_ENGINE_URL?: string;
        JUPITER_API_URL?: string;
    };
    security?: {
        acknowledge_terms_of_service: boolean;
    };
    monitoring?: {
        webhook_url?: string;
        log_level?: string;
    };
}
/**
 * 配置验证结果
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * 配置加载器类
 */
export declare class ConfigLoader {
    private static globalConfig;
    /**
     * 加载全局配置
     * @param configPath 配置文件路径
     * @returns 全局配置对象
     */
    static loadGlobalConfig(configPath?: string): GlobalConfig;
    /**
     * 加载模块配置
     * @param configPath 模块配置文件路径
     * @returns 解析后的配置对象
     */
    static loadModuleConfig<T>(configPath: string): T;
    /**
     * 变量替换
     * 将配置中的 ${VAR} 替换为 global.toml 中定义的值
     * @param content 配置文件内容
     * @returns 替换后的内容
     */
    private static replaceVariables;
    /**
     * 验证配置
     * @param config 配置对象
     * @param requiredFields 必需字段列表
     * @returns 验证结果
     */
    static validateConfig(config: any, requiredFields?: string[]): ValidationResult;
    /**
     * 检查嵌套属性是否存在
     * @param obj 对象
     * @param path 属性路径（如 "global.DEFAULT_RPC_URL"）
     * @returns 是否存在
     */
    private static hasNestedProperty;
    /**
     * 获取已加载的全局配置
     * @returns 全局配置或 null
     */
    static getGlobalConfig(): GlobalConfig | null;
    /**
     * 重置缓存的全局配置
     */
    static resetGlobalConfig(): void;
}
export default ConfigLoader;
//# sourceMappingURL=loader.d.ts.map