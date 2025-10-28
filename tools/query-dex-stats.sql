-- 查询过去7天的DEX套利机会统计
SELECT 
    dex_a, 
    dex_b, 
    COUNT(*) as opportunity_count,
    AVG(profit_lamports)::bigint as avg_profit_lamports,
    MAX(profit_lamports) as max_profit_lamports,
    MIN(profit_lamports) as min_profit_lamports,
    ROUND(AVG(profit_lamports) / 1000000000.0, 6) as avg_profit_sol,
    ROUND(MAX(profit_lamports) / 1000000000.0, 6) as max_profit_sol
FROM arbitrage_opportunities 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY dex_a, dex_b 
ORDER BY opportunity_count DESC 
LIMIT 20;

-- 所有DEX的统计
SELECT '=== DEX Priority ===' as section;

SELECT 
    dex,
    COUNT(*) as total_opportunities,
    ROUND(AVG(profit_lamports) / 1000000000.0, 6) as avg_profit_sol
FROM (
    SELECT dex_a as dex, profit_lamports FROM arbitrage_opportunities
    UNION ALL
    SELECT dex_b as dex, profit_lamports FROM arbitrage_opportunities
) combined
GROUP BY dex
ORDER BY total_opportunities DESC;



