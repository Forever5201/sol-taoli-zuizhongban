-- 分析opportunity_validations数据

-- 1. 总体统计
SELECT 
  '总体统计' as category,
  COUNT(*) as total,
  COUNT(CASE WHEN still_exists THEN 1 END) as passed,
  ROUND(COUNT(CASE WHEN still_exists THEN 1 END)::NUMERIC / COUNT(*) * 100, 2) as pass_rate,
  ROUND(AVG(validation_delay_ms), 0) as avg_delay_ms
FROM opportunity_validations;

-- 2. 按时间段统计
SELECT 
  '昨天08:53-23:54' as time_range,
  COUNT(*) as total,
  COUNT(CASE WHEN still_exists THEN 1 END) as passed,
  ROUND(COUNT(CASE WHEN still_exists THEN 1 END)::NUMERIC / COUNT(*) * 100, 2) as pass_rate
FROM opportunity_validations
WHERE first_detected_at >= '2025-10-24 08:53:00' AND first_detected_at <= '2025-10-24 23:54:00'
UNION ALL
SELECT 
  '今天00:20-10:54' as time_range,
  COUNT(*) as total,
  COUNT(CASE WHEN still_exists THEN 1 END) as passed,
  ROUND(COUNT(CASE WHEN still_exists THEN 1 END)::NUMERIC / COUNT(*) * 100, 2) as pass_rate
FROM opportunity_validations
WHERE first_detected_at >= '2025-10-25 00:20:00' AND first_detected_at <= '2025-10-25 10:54:00';

-- 3. Worker高估误差分析
SELECT 
  'Worker高估案例' as category,
  COUNT(*) as count,
  ROUND(AVG(first_profit - second_profit) / 1e9, 6) as avg_error_sol,
  ROUND(AVG((first_profit - second_profit)::NUMERIC / first_profit * 100), 2) as avg_error_pct
FROM opportunity_validations
WHERE first_profit > 5000000 AND second_profit < 5000000;

-- 4. 利润分布
SELECT 
  CASE 
    WHEN first_profit < 2000000 THEN '<0.002 SOL'
    WHEN first_profit < 5000000 THEN '0.002-0.005 SOL'
    WHEN first_profit < 10000000 THEN '0.005-0.010 SOL'
    ELSE '>0.010 SOL'
  END as profit_range,
  COUNT(*) as count,
  COUNT(CASE WHEN still_exists THEN 1 END) as passed,
  ROUND(COUNT(CASE WHEN still_exists THEN 1 END)::NUMERIC / COUNT(*) * 100, 2) as pass_rate
FROM opportunity_validations
GROUP BY 
  CASE 
    WHEN first_profit < 2000000 THEN '<0.002 SOL'
    WHEN first_profit < 5000000 THEN '0.002-0.005 SOL'
    WHEN first_profit < 10000000 THEN '0.005-0.010 SOL'
    ELSE '>0.010 SOL'
  END
ORDER BY MIN(first_profit);

-- 5. 典型误报案例（前10个）
SELECT 
  first_detected_at,
  ROUND(first_profit / 1e9, 6) as worker_profit_sol,
  ROUND(second_profit / 1e9, 6) as main_profit_sol,
  ROUND((first_profit - second_profit) / 1e9, 6) as error_sol,
  ROUND((first_profit - second_profit)::NUMERIC / first_profit * 100, 2) as error_pct,
  validation_delay_ms
FROM opportunity_validations
WHERE first_profit > 5000000 AND second_profit < 5000000
ORDER BY first_detected_at DESC
LIMIT 10;

