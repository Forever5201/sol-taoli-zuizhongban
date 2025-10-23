-- ============================================================================
-- 数据库迁移SQL：添加详细延迟跟踪字段
-- ============================================================================
-- 目的：为opportunity_validations表添加4个新字段，用于记录详细的API查询延迟
-- 创建时间：2025-10-23
-- 影响范围：opportunity_validations表

-- 添加新字段到opportunity_validations表
ALTER TABLE opportunity_validations
ADD COLUMN IF NOT EXISTS first_outbound_ms INTEGER,
ADD COLUMN IF NOT EXISTS first_return_ms INTEGER,
ADD COLUMN IF NOT EXISTS second_outbound_ms INTEGER,
ADD COLUMN IF NOT EXISTS second_return_ms INTEGER;

-- 添加字段注释
COMMENT ON COLUMN opportunity_validations.first_outbound_ms IS 'Worker发现机会时的去程查询延迟（毫秒）';
COMMENT ON COLUMN opportunity_validations.first_return_ms IS 'Worker发现机会时的回程查询延迟（毫秒）';
COMMENT ON COLUMN opportunity_validations.second_outbound_ms IS '二次验证的去程查询延迟（毫秒）';
COMMENT ON COLUMN opportunity_validations.second_return_ms IS '二次验证的回程查询延迟（毫秒）';

-- 验证迁移
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'opportunity_validations'
    AND column_name IN ('first_outbound_ms', 'first_return_ms', 'second_outbound_ms', 'second_return_ms');

-- 预期输出：
-- first_outbound_ms  | integer | YES
-- first_return_ms    | integer | YES
-- second_outbound_ms | integer | YES
-- second_return_ms   | integer | YES

