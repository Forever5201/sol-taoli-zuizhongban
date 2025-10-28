-- 查询数据库中的表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 如果有 arbitrage_opportunities 表
SELECT 
    'DEX Pair Stats' as section;
    
SELECT 
    dex_a, 
    dex_b, 
    COUNT(*) as opportunity_count,
    ROUND(AVG(profit_lamports::numeric) / 1000000000, 6) as avg_profit_sol,
    ROUND(MAX(profit_lamports::numeric) / 1000000000, 6) as max_profit_sol
FROM arbitrage_opportunities
GROUP BY dex_a, dex_b 
ORDER BY opportunity_count DESC 
LIMIT 15;

-- 单个DEX统计
SELECT 
    '=== Individual DEX Stats ===' as section;

SELECT 
    dex,
    COUNT(*) as total_opportunities,
    ROUND(AVG(profit_lamports::numeric) / 1000000000, 6) as avg_profit_sol
FROM (
    SELECT dex_a as dex, profit_lamports FROM arbitrage_opportunities
    UNION ALL
    SELECT dex_b as dex, profit_lamports FROM arbitrage_opportunities
) combined
GROUP BY dex
ORDER BY total_opportunities DESC;


