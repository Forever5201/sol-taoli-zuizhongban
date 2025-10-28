-- 测试数据库记录功能
-- 手动插入一个测试机会

-- 插入测试套利机会
INSERT INTO arbitrage_opportunities (
    discovered_at,
    subscription_started_at,
    time_since_subscription_ms,
    arbitrage_type,
    start_token,
    end_token,
    input_amount,
    output_amount,
    gross_profit,
    net_profit,
    roi_percent,
    estimated_fees,
    hop_count,
    path_summary,
    router_mode,
    min_roi_threshold
) VALUES (
    NOW(),
    NOW() - INTERVAL '5 minutes',
    300000,
    'Triangle',
    'USDC',
    'USDC',
    1000.00,
    1004.52,
    4.52,
    4.15,
    0.4150,
    0.37,
    3,
    'USDC→SOL→USDT→USDC',
    'Complete',
    0.3
) RETURNING id;

-- 查询刚插入的记录
SELECT * FROM arbitrage_opportunities ORDER BY id DESC LIMIT 1;

-- 统计
SELECT COUNT(*) as total_opportunities FROM arbitrage_opportunities;


-- 手动插入一个测试机会

-- 插入测试套利机会
INSERT INTO arbitrage_opportunities (
    discovered_at,
    subscription_started_at,
    time_since_subscription_ms,
    arbitrage_type,
    start_token,
    end_token,
    input_amount,
    output_amount,
    gross_profit,
    net_profit,
    roi_percent,
    estimated_fees,
    hop_count,
    path_summary,
    router_mode,
    min_roi_threshold
) VALUES (
    NOW(),
    NOW() - INTERVAL '5 minutes',
    300000,
    'Triangle',
    'USDC',
    'USDC',
    1000.00,
    1004.52,
    4.52,
    4.15,
    0.4150,
    0.37,
    3,
    'USDC→SOL→USDT→USDC',
    'Complete',
    0.3
) RETURNING id;

-- 查询刚插入的记录
SELECT * FROM arbitrage_opportunities ORDER BY id DESC LIMIT 1;

-- 统计
SELECT COUNT(*) as total_opportunities FROM arbitrage_opportunities;















