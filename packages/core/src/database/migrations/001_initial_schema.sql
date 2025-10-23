-- 初始数据库架构迁移
-- PostgreSQL 套利机器人数据库

-- 创建交易记录表
CREATE TABLE IF NOT EXISTS trades (
  -- 主键和标识
  id BIGSERIAL PRIMARY KEY,
  signature VARCHAR(88) UNIQUE NOT NULL,
  
  -- 时间信息
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- 状态信息
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  
  -- 代币信息
  input_mint VARCHAR(44) NOT NULL,
  output_mint VARCHAR(44) NOT NULL,
  bridge_token VARCHAR(10),
  bridge_mint VARCHAR(44),
  
  -- 金额信息（单位：lamports）
  input_amount BIGINT NOT NULL,
  output_amount BIGINT NOT NULL,
  bridge_amount BIGINT,
  
  -- 利润和费用
  gross_profit BIGINT NOT NULL,
  net_profit BIGINT NOT NULL,
  roi DECIMAL(10, 4),
  
  -- 费用明细
  flashloan_fee BIGINT NOT NULL DEFAULT 0,
  flashloan_amount BIGINT NOT NULL DEFAULT 0,
  flashloan_provider VARCHAR(20),
  jito_tip BIGINT NOT NULL DEFAULT 0,
  gas_fee BIGINT NOT NULL DEFAULT 0,
  priority_fee BIGINT NOT NULL DEFAULT 0,
  total_fee BIGINT NOT NULL,
  
  -- 交易详情
  compute_units_used INTEGER,
  compute_unit_price INTEGER,
  
  -- 关联信息
  opportunity_id BIGINT,
  
  -- 索引字段
  trade_date DATE NOT NULL,
  hour_of_day INTEGER,
  
  -- 元数据
  metadata JSONB
);

-- 创建索引
CREATE INDEX idx_trades_executed_at ON trades(executed_at DESC);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_trade_date ON trades(trade_date DESC);
CREATE INDEX idx_trades_input_mint ON trades(input_mint);
CREATE INDEX idx_trades_bridge_token ON trades(bridge_token);
CREATE INDEX idx_trades_net_profit ON trades(net_profit DESC);
CREATE INDEX idx_trades_roi ON trades(roi DESC);

-- 创建套利机会记录表
CREATE TABLE IF NOT EXISTS opportunities (
  -- 主键和标识
  id BIGSERIAL PRIMARY KEY,
  
  -- 时间信息
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- 代币信息
  input_mint VARCHAR(44) NOT NULL,
  output_mint VARCHAR(44) NOT NULL,
  bridge_token VARCHAR(10),
  bridge_mint VARCHAR(44),
  
  -- 预期金额（单位：lamports）
  input_amount BIGINT NOT NULL,
  output_amount BIGINT NOT NULL,
  bridge_amount BIGINT,
  
  -- 预期利润
  expected_profit BIGINT NOT NULL,
  expected_roi DECIMAL(10, 4) NOT NULL,
  
  -- 执行信息
  executed BOOLEAN DEFAULT FALSE,
  trade_id BIGINT,
  
  -- 过滤原因
  filtered BOOLEAN DEFAULT FALSE,
  filter_reason TEXT,
  
  -- 元数据
  metadata JSONB
);

-- 创建索引
CREATE INDEX idx_opportunities_discovered_at ON opportunities(discovered_at DESC);
CREATE INDEX idx_opportunities_executed ON opportunities(executed);
CREATE INDEX idx_opportunities_expected_profit ON opportunities(expected_profit DESC);
CREATE INDEX idx_opportunities_input_mint ON opportunities(input_mint);
CREATE INDEX idx_opportunities_bridge_token ON opportunities(bridge_token);

-- 创建交易路由详情表
CREATE TABLE IF NOT EXISTS trade_routes (
  id BIGSERIAL PRIMARY KEY,
  trade_id BIGINT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  
  -- 路由顺序
  step_number INTEGER NOT NULL,
  direction VARCHAR(10) NOT NULL,
  
  -- DEX 信息
  dex_name VARCHAR(50) NOT NULL,
  pool_address VARCHAR(44),
  
  -- 交易对
  input_mint VARCHAR(44) NOT NULL,
  output_mint VARCHAR(44) NOT NULL,
  
  -- 金额
  input_amount BIGINT NOT NULL,
  output_amount BIGINT NOT NULL,
  
  -- 价格影响
  price_impact DECIMAL(10, 6),
  
  UNIQUE(trade_id, step_number, direction)
);

-- 创建索引
CREATE INDEX idx_trade_routes_trade_id ON trade_routes(trade_id);
CREATE INDEX idx_trade_routes_dex_name ON trade_routes(dex_name);

-- 创建每日统计汇总表
CREATE TABLE IF NOT EXISTS daily_statistics (
  id BIGSERIAL PRIMARY KEY,
  stat_date DATE NOT NULL UNIQUE,
  
  -- 交易统计
  total_trades INTEGER NOT NULL DEFAULT 0,
  successful_trades INTEGER NOT NULL DEFAULT 0,
  failed_trades INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL(5, 2),
  
  -- 机会统计
  opportunities_found INTEGER NOT NULL DEFAULT 0,
  opportunities_executed INTEGER NOT NULL DEFAULT 0,
  execution_rate DECIMAL(5, 2),
  
  -- 利润统计（单位：lamports）
  total_gross_profit BIGINT NOT NULL DEFAULT 0,
  total_net_profit BIGINT NOT NULL DEFAULT 0,
  avg_profit_per_trade BIGINT,
  max_single_profit BIGINT,
  min_single_profit BIGINT,
  
  -- 费用统计
  total_flashloan_fee BIGINT NOT NULL DEFAULT 0,
  total_jito_tip BIGINT NOT NULL DEFAULT 0,
  total_gas_fee BIGINT NOT NULL DEFAULT 0,
  total_fees BIGINT NOT NULL DEFAULT 0,
  
  -- ROI 统计
  avg_roi DECIMAL(10, 4),
  max_roi DECIMAL(10, 4),
  min_roi DECIMAL(10, 4),
  
  -- 更新时间
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_daily_statistics_stat_date ON daily_statistics(stat_date DESC);

-- 创建代币统计表
CREATE TABLE IF NOT EXISTS token_statistics (
  id BIGSERIAL PRIMARY KEY,
  token_mint VARCHAR(44) NOT NULL,
  token_symbol VARCHAR(10),
  
  -- 统计周期
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- 交易统计
  total_trades INTEGER NOT NULL DEFAULT 0,
  successful_trades INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL(5, 2),
  
  -- 利润统计
  total_net_profit BIGINT NOT NULL DEFAULT 0,
  avg_profit_per_trade BIGINT,
  
  -- 更新时间
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(token_mint, period_start, period_end)
);

-- 创建索引
CREATE INDEX idx_token_statistics_token_mint ON token_statistics(token_mint);
CREATE INDEX idx_token_statistics_period ON token_statistics(period_start, period_end);

-- 添加外键约束
ALTER TABLE trades ADD CONSTRAINT fk_trades_opportunity
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id);

-- 创建注释
COMMENT ON TABLE trades IS '交易记录表 - 记录所有执行的套利交易';
COMMENT ON TABLE opportunities IS '套利机会记录表 - 记录发现的高质量机会（保留30天）';
COMMENT ON TABLE trade_routes IS '交易路由详情表 - 记录每笔交易的详细路由信息';
COMMENT ON TABLE daily_statistics IS '每日统计汇总表 - 缓存每日统计数据加速查询';
COMMENT ON TABLE token_statistics IS '代币统计表 - 按代币统计交易表现';



