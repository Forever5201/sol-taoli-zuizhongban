-- 测试各种查询功能

\echo '=== 1. 最近的套利机会 ==='
SELECT 
    id,
    TO_CHAR(discovered_at, 'YYYY-MM-DD HH24:MI:SS') as time,
    arbitrage_type,
    ROUND(roi_percent::numeric, 4) as roi,
    path_summary
FROM arbitrage_opportunities
ORDER BY discovered_at DESC
LIMIT 5;

\echo '\n=== 2. 统计信息 ==='
SELECT 
    COUNT(*) as total,
    ROUND(AVG(roi_percent)::numeric, 4) as avg_roi,
    ROUND(MIN(roi_percent)::numeric, 4) as min_roi,
    ROUND(MAX(roi_percent)::numeric, 4) as max_roi,
    ROUND(AVG(hop_count)::numeric, 2) as avg_hops
FROM arbitrage_opportunities;

\echo '\n=== 3. 按类型统计 ==='
SELECT 
    arbitrage_type,
    COUNT(*) as count,
    ROUND(AVG(roi_percent)::numeric, 4) as avg_roi
FROM arbitrage_opportunities
GROUP BY arbitrage_type
ORDER BY count DESC;

\echo '\n=== 4. ROI分布 ==='
SELECT 
    CASE 
        WHEN roi_percent < 0.5 THEN '< 0.5%'
        WHEN roi_percent < 1.0 THEN '0.5-1.0%'
        WHEN roi_percent < 2.0 THEN '1.0-2.0%'
        ELSE '> 2.0%'
    END as roi_range,
    COUNT(*) as count
FROM arbitrage_opportunities
GROUP BY 
    CASE 
        WHEN roi_percent < 0.5 THEN '< 0.5%'
        WHEN roi_percent < 1.0 THEN '0.5-1.0%'
        WHEN roi_percent < 2.0 THEN '1.0-2.0%'
        ELSE '> 2.0%'
    END
ORDER BY MIN(roi_percent);

\echo '\n=== 5. DEX使用统计 ==='
SELECT 
    s.dex_name,
    COUNT(DISTINCT s.opportunity_id) as opportunities,
    ROUND(AVG(o.roi_percent)::numeric, 4) as avg_roi
FROM arbitrage_steps s
JOIN arbitrage_opportunities o ON s.opportunity_id = o.id
GROUP BY s.dex_name
ORDER BY opportunities DESC;

\echo '\n=== 6. 最佳机会详情 ==='
SELECT 
    o.id,
    o.path_summary,
    ROUND(o.roi_percent::numeric, 4) as roi,
    ROUND(o.net_profit::numeric, 2) as profit,
    o.hop_count
FROM arbitrage_opportunities o
ORDER BY o.roi_percent DESC
LIMIT 1;

\echo '\n✅ 所有查询测试完成！'



\echo '=== 1. 最近的套利机会 ==='
SELECT 
    id,
    TO_CHAR(discovered_at, 'YYYY-MM-DD HH24:MI:SS') as time,
    arbitrage_type,
    ROUND(roi_percent::numeric, 4) as roi,
    path_summary
FROM arbitrage_opportunities
ORDER BY discovered_at DESC
LIMIT 5;

\echo '\n=== 2. 统计信息 ==='
SELECT 
    COUNT(*) as total,
    ROUND(AVG(roi_percent)::numeric, 4) as avg_roi,
    ROUND(MIN(roi_percent)::numeric, 4) as min_roi,
    ROUND(MAX(roi_percent)::numeric, 4) as max_roi,
    ROUND(AVG(hop_count)::numeric, 2) as avg_hops
FROM arbitrage_opportunities;

\echo '\n=== 3. 按类型统计 ==='
SELECT 
    arbitrage_type,
    COUNT(*) as count,
    ROUND(AVG(roi_percent)::numeric, 4) as avg_roi
FROM arbitrage_opportunities
GROUP BY arbitrage_type
ORDER BY count DESC;

\echo '\n=== 4. ROI分布 ==='
SELECT 
    CASE 
        WHEN roi_percent < 0.5 THEN '< 0.5%'
        WHEN roi_percent < 1.0 THEN '0.5-1.0%'
        WHEN roi_percent < 2.0 THEN '1.0-2.0%'
        ELSE '> 2.0%'
    END as roi_range,
    COUNT(*) as count
FROM arbitrage_opportunities
GROUP BY 
    CASE 
        WHEN roi_percent < 0.5 THEN '< 0.5%'
        WHEN roi_percent < 1.0 THEN '0.5-1.0%'
        WHEN roi_percent < 2.0 THEN '1.0-2.0%'
        ELSE '> 2.0%'
    END
ORDER BY MIN(roi_percent);

\echo '\n=== 5. DEX使用统计 ==='
SELECT 
    s.dex_name,
    COUNT(DISTINCT s.opportunity_id) as opportunities,
    ROUND(AVG(o.roi_percent)::numeric, 4) as avg_roi
FROM arbitrage_steps s
JOIN arbitrage_opportunities o ON s.opportunity_id = o.id
GROUP BY s.dex_name
ORDER BY opportunities DESC;

\echo '\n=== 6. 最佳机会详情 ==='
SELECT 
    o.id,
    o.path_summary,
    ROUND(o.roi_percent::numeric, 4) as roi,
    ROUND(o.net_profit::numeric, 2) as profit,
    o.hop_count
FROM arbitrage_opportunities o
ORDER BY o.roi_percent DESC
LIMIT 1;

\echo '\n✅ 所有查询测试完成！'















