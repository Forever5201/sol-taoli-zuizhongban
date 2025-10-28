-- 测试完整的套利机会记录（包含路径详情）

-- Step 1: 插入套利机会
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
    NOW() - INTERVAL '2 minutes',
    120000,
    'Triangle',
    'USDC',
    'USDC',
    1000.00,
    1002.62,
    2.62,
    2.35,
    0.2350,
    0.27,
    3,
    'USDC→SOL→USDT→USDC',
    'Complete',
    0.3
) RETURNING id;

-- 获取最后插入的ID (在psql中使用变量)
\gset opp_

-- Step 2: 插入路径步骤
INSERT INTO arbitrage_steps (
    opportunity_id,
    step_order,
    pool_id,
    dex_name,
    input_token,
    output_token,
    price,
    liquidity_base,
    liquidity_quote,
    expected_input,
    expected_output
) VALUES
-- 步骤1: USDC → SOL
(
    :opp_id,
    1,
    '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
    'Raydium AMM V4',
    'USDC',
    'SOL',
    0.00666667,
    1000000000000000,
    150000000000000,
    1000.00,
    6.65
),
-- 步骤2: SOL → USDT
(
    :opp_id,
    2,
    '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX',
    'Orca Whirlpool',
    'SOL',
    'USDT',
    150.8,
    1000000000000000,
    150800000000000,
    6.65,
    1002.32
),
-- 步骤3: USDT → USDC
(
    :opp_id,
    3,
    'Pi9nzTjPxD8DsRfRBGfKYzmefJoJM8TcXu2jyaQjSHm',
    'AlphaQ',
    'USDT',
    'USDC',
    1.0,
    10000000000000,
    10000000000000,
    1002.32,
    1002.62
);

-- Step 3: 查询完整记录
SELECT 
    o.id,
    o.discovered_at,
    o.roi_percent,
    o.path_summary,
    COUNT(s.id) as step_count
FROM arbitrage_opportunities o
LEFT JOIN arbitrage_steps s ON o.id = s.opportunity_id
WHERE o.id = :opp_id
GROUP BY o.id;

-- Step 4: 查询路径详情
SELECT 
    step_order,
    dex_name,
    input_token,
    output_token,
    price,
    expected_input,
    expected_output
FROM arbitrage_steps
WHERE opportunity_id = :opp_id
ORDER BY step_order;

-- Step 5: 统计
SELECT 
    COUNT(*) as total_opportunities,
    AVG(roi_percent) as avg_roi,
    SUM(CASE WHEN hop_count = 2 THEN 1 ELSE 0 END) as two_hop,
    SUM(CASE WHEN hop_count = 3 THEN 1 ELSE 0 END) as three_hop
FROM arbitrage_opportunities;

\echo '\n✅ 测试完成！数据已成功记录到数据库。'



-- Step 1: 插入套利机会
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
    NOW() - INTERVAL '2 minutes',
    120000,
    'Triangle',
    'USDC',
    'USDC',
    1000.00,
    1002.62,
    2.62,
    2.35,
    0.2350,
    0.27,
    3,
    'USDC→SOL→USDT→USDC',
    'Complete',
    0.3
) RETURNING id;

-- 获取最后插入的ID (在psql中使用变量)
\gset opp_

-- Step 2: 插入路径步骤
INSERT INTO arbitrage_steps (
    opportunity_id,
    step_order,
    pool_id,
    dex_name,
    input_token,
    output_token,
    price,
    liquidity_base,
    liquidity_quote,
    expected_input,
    expected_output
) VALUES
-- 步骤1: USDC → SOL
(
    :opp_id,
    1,
    '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
    'Raydium AMM V4',
    'USDC',
    'SOL',
    0.00666667,
    1000000000000000,
    150000000000000,
    1000.00,
    6.65
),
-- 步骤2: SOL → USDT
(
    :opp_id,
    2,
    '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX',
    'Orca Whirlpool',
    'SOL',
    'USDT',
    150.8,
    1000000000000000,
    150800000000000,
    6.65,
    1002.32
),
-- 步骤3: USDT → USDC
(
    :opp_id,
    3,
    'Pi9nzTjPxD8DsRfRBGfKYzmefJoJM8TcXu2jyaQjSHm',
    'AlphaQ',
    'USDT',
    'USDC',
    1.0,
    10000000000000,
    10000000000000,
    1002.32,
    1002.62
);

-- Step 3: 查询完整记录
SELECT 
    o.id,
    o.discovered_at,
    o.roi_percent,
    o.path_summary,
    COUNT(s.id) as step_count
FROM arbitrage_opportunities o
LEFT JOIN arbitrage_steps s ON o.id = s.opportunity_id
WHERE o.id = :opp_id
GROUP BY o.id;

-- Step 4: 查询路径详情
SELECT 
    step_order,
    dex_name,
    input_token,
    output_token,
    price,
    expected_input,
    expected_output
FROM arbitrage_steps
WHERE opportunity_id = :opp_id
ORDER BY step_order;

-- Step 5: 统计
SELECT 
    COUNT(*) as total_opportunities,
    AVG(roi_percent) as avg_roi,
    SUM(CASE WHEN hop_count = 2 THEN 1 ELSE 0 END) as two_hop,
    SUM(CASE WHEN hop_count = 3 THEN 1 ELSE 0 END) as three_hop
FROM arbitrage_opportunities;

\echo '\n✅ 测试完成！数据已成功记录到数据库。'















