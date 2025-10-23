-- ============================================================================
-- 清空数据库旧数据（保留表结构）
-- ============================================================================
-- 目的：删除所有旧的机会和验证记录，准备重新开始记录完整数据
-- 创建时间：2025-10-23
-- ⚠️ 警告：此操作不可逆！请确认后执行

-- 开始事务（如果出错可以回滚）
BEGIN;

-- 显示清理前的统计
SELECT '========== 清理前统计 ==========' AS status;
SELECT 
    'opportunities' AS table_name,
    COUNT(*) AS record_count
FROM opportunities
UNION ALL
SELECT 
    'opportunity_validations',
    COUNT(*)
FROM opportunity_validations
UNION ALL
SELECT 
    'trade_routes',
    COUNT(*)
FROM trade_routes
UNION ALL
SELECT 
    'flash_loan_transactions',
    COUNT(*)
FROM flash_loan_transactions;

-- 1. 清空机会验证表（外键约束，需要先删除）
TRUNCATE TABLE opportunity_validations CASCADE;

-- 2. 清空交易路由表
TRUNCATE TABLE trade_routes CASCADE;

-- 3. 清空闪电贷交易表
TRUNCATE TABLE flash_loan_transactions CASCADE;

-- 4. 清空机会表
TRUNCATE TABLE opportunities CASCADE;

-- 5. 重置自增ID（可选，从1重新开始）
ALTER SEQUENCE opportunities_id_seq RESTART WITH 1;
ALTER SEQUENCE opportunity_validations_id_seq RESTART WITH 1;
ALTER SEQUENCE trade_routes_id_seq RESTART WITH 1;
ALTER SEQUENCE flash_loan_transactions_id_seq RESTART WITH 1;

-- 显示清理后的统计
SELECT '========== 清理后统计 ==========' AS status;
SELECT 
    'opportunities' AS table_name,
    COUNT(*) AS record_count
FROM opportunities
UNION ALL
SELECT 
    'opportunity_validations',
    COUNT(*)
FROM opportunity_validations
UNION ALL
SELECT 
    'trade_routes',
    COUNT(*)
FROM trade_routes
UNION ALL
SELECT 
    'flash_loan_transactions',
    COUNT(*)
FROM flash_loan_transactions;

-- 提交事务
COMMIT;

-- 最终确认
SELECT '========== ✅ 清理完成 ==========' AS status;
SELECT 
    '所有旧数据已删除，ID序列已重置' AS message,
    NOW() AS cleared_at;

