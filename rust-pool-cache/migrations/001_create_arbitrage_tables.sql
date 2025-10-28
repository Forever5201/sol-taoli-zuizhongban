-- 套利机会数据库表结构
-- 用于记录路由器发现的所有套利机会

-- 主表：arbitrage_opportunities
-- 记录每个发现的套利机会
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id SERIAL PRIMARY KEY,
    
    -- 时间信息
    discovered_at TIMESTAMP NOT NULL,
    subscription_started_at TIMESTAMP,
    time_since_subscription_ms INTEGER,
    
    -- 基本信息
    arbitrage_type VARCHAR(20) NOT NULL,  -- Direct, Triangle, MultiHop
    start_token VARCHAR(20) NOT NULL,
    end_token VARCHAR(20) NOT NULL,
    
    -- 金额和利润
    input_amount DECIMAL(20, 6) NOT NULL,
    output_amount DECIMAL(20, 6) NOT NULL,
    gross_profit DECIMAL(20, 6) NOT NULL,
    net_profit DECIMAL(20, 6) NOT NULL,
    roi_percent DECIMAL(10, 4) NOT NULL,
    estimated_fees DECIMAL(20, 6) NOT NULL,
    
    -- 路径信息
    hop_count INTEGER NOT NULL,
    path_summary TEXT NOT NULL,  -- e.g., "USDC→SOL→USDT→USDC"
    
    -- 状态
    is_executed BOOLEAN DEFAULT FALSE,
    execution_status VARCHAR(50),
    execution_tx_hash VARCHAR(100),
    actual_profit DECIMAL(20, 6),
    
    -- 元数据
    router_mode VARCHAR(20),  -- fast, complete, hybrid
    min_roi_threshold DECIMAL(10, 4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_opportunities_discovered_at ON arbitrage_opportunities(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_roi ON arbitrage_opportunities(roi_percent DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON arbitrage_opportunities(arbitrage_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_executed ON arbitrage_opportunities(is_executed);

-- 详细路径表：arbitrage_steps
-- 记录每个机会的具体路径步骤
CREATE TABLE IF NOT EXISTS arbitrage_steps (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES arbitrage_opportunities(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    
    -- 池子信息
    pool_id VARCHAR(100) NOT NULL,
    dex_name VARCHAR(50) NOT NULL,
    
    -- 交易信息
    input_token VARCHAR(20) NOT NULL,
    output_token VARCHAR(20) NOT NULL,
    price DECIMAL(20, 10) NOT NULL,
    
    -- 流动性
    liquidity_base BIGINT,
    liquidity_quote BIGINT,
    
    -- 预期金额
    expected_input DECIMAL(20, 6),
    expected_output DECIMAL(20, 6),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_steps_opportunity ON arbitrage_steps(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_steps_dex ON arbitrage_steps(dex_name);

-- 池子更新统计表：pool_updates
-- 记录池子更新频率，用于分析
CREATE TABLE IF NOT EXISTS pool_updates (
    id SERIAL PRIMARY KEY,
    pool_address VARCHAR(100) NOT NULL,
    pool_name VARCHAR(100) NOT NULL,
    pool_type VARCHAR(50) NOT NULL,
    
    updated_at TIMESTAMP NOT NULL,
    
    -- 价格信息
    price DECIMAL(20, 10),
    base_reserve BIGINT,
    quote_reserve BIGINT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_pool_updates_address ON pool_updates(pool_address);
CREATE INDEX IF NOT EXISTS idx_pool_updates_time ON pool_updates(updated_at DESC);

-- 性能统计表：router_performance
-- 记录路由器性能指标
CREATE TABLE IF NOT EXISTS router_performance (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    
    -- 性能指标
    scan_duration_ms INTEGER,
    opportunities_found INTEGER,
    pools_scanned INTEGER,
    
    -- 路由器配置
    router_mode VARCHAR(20),
    min_roi_percent DECIMAL(10, 4),
    max_hops INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON router_performance(timestamp DESC);

-- 创建视图：最近的套利机会（包含路径详情）
CREATE OR REPLACE VIEW recent_opportunities_with_paths AS
SELECT 
    o.*,
    json_agg(
        json_build_object(
            'step_order', s.step_order,
            'pool_id', s.pool_id,
            'dex_name', s.dex_name,
            'input_token', s.input_token,
            'output_token', s.output_token,
            'price', s.price,
            'expected_input', s.expected_input,
            'expected_output', s.expected_output
        ) ORDER BY s.step_order
    ) as steps
FROM arbitrage_opportunities o
LEFT JOIN arbitrage_steps s ON o.id = s.opportunity_id
GROUP BY o.id
ORDER BY o.discovered_at DESC;

-- 创建视图：ROI统计
CREATE OR REPLACE VIEW roi_statistics AS
SELECT 
    DATE_TRUNC('hour', discovered_at) as hour,
    COUNT(*) as opportunity_count,
    AVG(roi_percent) as avg_roi,
    MIN(roi_percent) as min_roi,
    MAX(roi_percent) as max_roi,
    AVG(hop_count) as avg_hops,
    COUNT(CASE WHEN is_executed THEN 1 END) as executed_count
FROM arbitrage_opportunities
GROUP BY DATE_TRUNC('hour', discovered_at)
ORDER BY hour DESC;

-- 创建视图：DEX性能统计
CREATE OR REPLACE VIEW dex_performance AS
SELECT 
    s.dex_name,
    COUNT(DISTINCT s.opportunity_id) as opportunities_used,
    AVG(o.roi_percent) as avg_roi_when_used,
    COUNT(*) as total_steps
FROM arbitrage_steps s
JOIN arbitrage_opportunities o ON s.opportunity_id = o.id
GROUP BY s.dex_name
ORDER BY opportunities_used DESC;


-- 用于记录路由器发现的所有套利机会

-- 主表：arbitrage_opportunities
-- 记录每个发现的套利机会
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id SERIAL PRIMARY KEY,
    
    -- 时间信息
    discovered_at TIMESTAMP NOT NULL,
    subscription_started_at TIMESTAMP,
    time_since_subscription_ms INTEGER,
    
    -- 基本信息
    arbitrage_type VARCHAR(20) NOT NULL,  -- Direct, Triangle, MultiHop
    start_token VARCHAR(20) NOT NULL,
    end_token VARCHAR(20) NOT NULL,
    
    -- 金额和利润
    input_amount DECIMAL(20, 6) NOT NULL,
    output_amount DECIMAL(20, 6) NOT NULL,
    gross_profit DECIMAL(20, 6) NOT NULL,
    net_profit DECIMAL(20, 6) NOT NULL,
    roi_percent DECIMAL(10, 4) NOT NULL,
    estimated_fees DECIMAL(20, 6) NOT NULL,
    
    -- 路径信息
    hop_count INTEGER NOT NULL,
    path_summary TEXT NOT NULL,  -- e.g., "USDC→SOL→USDT→USDC"
    
    -- 状态
    is_executed BOOLEAN DEFAULT FALSE,
    execution_status VARCHAR(50),
    execution_tx_hash VARCHAR(100),
    actual_profit DECIMAL(20, 6),
    
    -- 元数据
    router_mode VARCHAR(20),  -- fast, complete, hybrid
    min_roi_threshold DECIMAL(10, 4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_opportunities_discovered_at ON arbitrage_opportunities(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_roi ON arbitrage_opportunities(roi_percent DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON arbitrage_opportunities(arbitrage_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_executed ON arbitrage_opportunities(is_executed);

-- 详细路径表：arbitrage_steps
-- 记录每个机会的具体路径步骤
CREATE TABLE IF NOT EXISTS arbitrage_steps (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES arbitrage_opportunities(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    
    -- 池子信息
    pool_id VARCHAR(100) NOT NULL,
    dex_name VARCHAR(50) NOT NULL,
    
    -- 交易信息
    input_token VARCHAR(20) NOT NULL,
    output_token VARCHAR(20) NOT NULL,
    price DECIMAL(20, 10) NOT NULL,
    
    -- 流动性
    liquidity_base BIGINT,
    liquidity_quote BIGINT,
    
    -- 预期金额
    expected_input DECIMAL(20, 6),
    expected_output DECIMAL(20, 6),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_steps_opportunity ON arbitrage_steps(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_steps_dex ON arbitrage_steps(dex_name);

-- 池子更新统计表：pool_updates
-- 记录池子更新频率，用于分析
CREATE TABLE IF NOT EXISTS pool_updates (
    id SERIAL PRIMARY KEY,
    pool_address VARCHAR(100) NOT NULL,
    pool_name VARCHAR(100) NOT NULL,
    pool_type VARCHAR(50) NOT NULL,
    
    updated_at TIMESTAMP NOT NULL,
    
    -- 价格信息
    price DECIMAL(20, 10),
    base_reserve BIGINT,
    quote_reserve BIGINT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_pool_updates_address ON pool_updates(pool_address);
CREATE INDEX IF NOT EXISTS idx_pool_updates_time ON pool_updates(updated_at DESC);

-- 性能统计表：router_performance
-- 记录路由器性能指标
CREATE TABLE IF NOT EXISTS router_performance (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    
    -- 性能指标
    scan_duration_ms INTEGER,
    opportunities_found INTEGER,
    pools_scanned INTEGER,
    
    -- 路由器配置
    router_mode VARCHAR(20),
    min_roi_percent DECIMAL(10, 4),
    max_hops INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON router_performance(timestamp DESC);

-- 创建视图：最近的套利机会（包含路径详情）
CREATE OR REPLACE VIEW recent_opportunities_with_paths AS
SELECT 
    o.*,
    json_agg(
        json_build_object(
            'step_order', s.step_order,
            'pool_id', s.pool_id,
            'dex_name', s.dex_name,
            'input_token', s.input_token,
            'output_token', s.output_token,
            'price', s.price,
            'expected_input', s.expected_input,
            'expected_output', s.expected_output
        ) ORDER BY s.step_order
    ) as steps
FROM arbitrage_opportunities o
LEFT JOIN arbitrage_steps s ON o.id = s.opportunity_id
GROUP BY o.id
ORDER BY o.discovered_at DESC;

-- 创建视图：ROI统计
CREATE OR REPLACE VIEW roi_statistics AS
SELECT 
    DATE_TRUNC('hour', discovered_at) as hour,
    COUNT(*) as opportunity_count,
    AVG(roi_percent) as avg_roi,
    MIN(roi_percent) as min_roi,
    MAX(roi_percent) as max_roi,
    AVG(hop_count) as avg_hops,
    COUNT(CASE WHEN is_executed THEN 1 END) as executed_count
FROM arbitrage_opportunities
GROUP BY DATE_TRUNC('hour', discovered_at)
ORDER BY hour DESC;

-- 创建视图：DEX性能统计
CREATE OR REPLACE VIEW dex_performance AS
SELECT 
    s.dex_name,
    COUNT(DISTINCT s.opportunity_id) as opportunities_used,
    AVG(o.roi_percent) as avg_roi_when_used,
    COUNT(*) as total_steps
FROM arbitrage_steps s
JOIN arbitrage_opportunities o ON s.opportunity_id = o.id
GROUP BY s.dex_name
ORDER BY opportunities_used DESC;















