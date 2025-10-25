-- 分析Worker第一次查询延迟（串行 vs 并行）

-- 1. 昨天的查询延迟（串行）
SELECT 
  '昨天08:53-23:54 (串行)' as period,
  COUNT(*) as count,
  ROUND(AVG(first_outbound_ms), 0) as avg_outbound_ms,
  ROUND(AVG(first_return_ms), 0) as avg_return_ms,
  ROUND(AVG(first_outbound_ms + first_return_ms), 0) as avg_total_ms,
  MIN(first_outbound_ms + first_return_ms) as min_total_ms,
  MAX(first_outbound_ms + first_return_ms) as max_total_ms
FROM opportunity_validations
WHERE first_detected_at >= '2025-10-24 08:53:00' 
  AND first_detected_at <= '2025-10-24 23:54:00'
  AND first_outbound_ms IS NOT NULL
  AND first_return_ms IS NOT NULL;

-- 2. 今天的查询延迟（并行）
SELECT 
  '今天00:20-10:54 (并行)' as period,
  COUNT(*) as count,
  ROUND(AVG(first_outbound_ms), 0) as avg_outbound_ms,
  ROUND(AVG(first_return_ms), 0) as avg_return_ms,
  ROUND(AVG(GREATEST(first_outbound_ms, first_return_ms)), 0) as avg_parallel_ms,
  MIN(GREATEST(first_outbound_ms, first_return_ms)) as min_parallel_ms,
  MAX(GREATEST(first_outbound_ms, first_return_ms)) as max_parallel_ms,
  ROUND(AVG(first_outbound_ms + first_return_ms), 0) as avg_if_serial_ms
FROM opportunity_validations
WHERE first_detected_at >= '2025-10-25 00:20:00' 
  AND first_detected_at <= '2025-10-25 10:54:00'
  AND first_outbound_ms IS NOT NULL
  AND first_return_ms IS NOT NULL;

-- 3. 对比分析
SELECT 
  CASE 
    WHEN first_detected_at >= '2025-10-24 08:53:00' AND first_detected_at <= '2025-10-24 23:54:00' 
    THEN '昨天(串行)'
    WHEN first_detected_at >= '2025-10-25 00:20:00' AND first_detected_at <= '2025-10-25 10:54:00'
    THEN '今天(并行)'
  END as period,
  COUNT(*) as count,
  ROUND(AVG(first_outbound_ms), 0) as avg_outbound_ms,
  ROUND(AVG(first_return_ms), 0) as avg_return_ms,
  ROUND(AVG(first_outbound_ms + first_return_ms), 0) as avg_serial_total,
  ROUND(AVG(GREATEST(first_outbound_ms, first_return_ms)), 0) as avg_parallel_total,
  ROUND(AVG(first_outbound_ms + first_return_ms) - AVG(GREATEST(first_outbound_ms, first_return_ms)), 0) as time_saved
FROM opportunity_validations
WHERE (
  (first_detected_at >= '2025-10-24 08:53:00' AND first_detected_at <= '2025-10-24 23:54:00')
  OR
  (first_detected_at >= '2025-10-25 00:20:00' AND first_detected_at <= '2025-10-25 10:54:00')
)
AND first_outbound_ms IS NOT NULL
AND first_return_ms IS NOT NULL
GROUP BY 
  CASE 
    WHEN first_detected_at >= '2025-10-24 08:53:00' AND first_detected_at <= '2025-10-24 23:54:00' 
    THEN '昨天(串行)'
    WHEN first_detected_at >= '2025-10-25 00:20:00' AND first_detected_at <= '2025-10-25 10:54:00'
    THEN '今天(并行)'
  END;

-- 4. 详细的前20条记录对比
SELECT 
  first_detected_at,
  first_outbound_ms as outbound,
  first_return_ms as return,
  (first_outbound_ms + first_return_ms) as serial_total,
  GREATEST(first_outbound_ms, first_return_ms) as parallel_total,
  (first_outbound_ms + first_return_ms - GREATEST(first_outbound_ms, first_return_ms)) as time_saved,
  ROUND(first_profit / 1e9, 6) as worker_profit,
  ROUND(second_profit / 1e9, 6) as main_profit,
  still_exists
FROM opportunity_validations
WHERE first_detected_at >= '2025-10-25 00:20:00' 
  AND first_detected_at <= '2025-10-25 10:54:00'
  AND first_outbound_ms IS NOT NULL
  AND first_return_ms IS NOT NULL
ORDER BY first_detected_at DESC
LIMIT 20;

