// SolFi V2 离线分析 - 使用已保存的数据
// 目标: 找到正确的储备量字段位置

const fs = require('fs');

// 从文件读取池子数据（如果有）
// 或者使用十六进制数据直接分析

console.log('='.repeat(80));
console.log('🔍 SolFi V2 储备量字段定位分析');
console.log('='.repeat(80));
console.log();

// SolFi V2 结构分析
// 数据大小: 1728 bytes
// 结构:
//   - 5 个 u64 (40 bytes)
//   - 25 个 Pubkey (800 bytes)
//   - 111 个 u64 (888 bytes)

console.log('📋 已知信息:');
console.log('  - 数据大小: 1728 bytes');
console.log('  - 当前读取到: Reserve A = 3000, Reserve B = 10000');
console.log('  - 问题: 这是配置值，不是真实储备');
console.log();

console.log('🎯 分析策略:');
console.log('  1. 真实储备量应该 > 100M (100,000,000)');
console.log('  2. 储备量应该成对出现（相邻的 u64）');
console.log('  3. 对于 USDC/USDT，两个值应该接近');
console.log();

// 模拟数据分析
console.log('💡 推荐解决方案:');
console.log();
console.log('方案 A: 修改启发式算法，排除小值');
console.log('```rust');
console.log('pub fn get_reserve_a(&self) -> u64 {');
console.log('    let min_reserve = 100_000_000u64;  // 100M 最小值');
console.log('    ');
console.log('    // 查找成对的大值，但排除明显的配置值');
console.log('    for i in 0..self.config_fields.len() - 1 {');
console.log('        let val_a = self.config_fields[i];');
console.log('        let val_b = self.config_fields[i + 1];');
console.log('        ');
console.log('        // 排除配置值 (< 100M)');
console.log('        if val_a < min_reserve || val_b < min_reserve {');
console.log('            continue;');
console.log('        }');
console.log('        ');
console.log('        // 检查比率合理性');
console.log('        let ratio = if val_a > val_b {');
console.log('            val_a as f64 / val_b as f64');
console.log('        } else {');
console.log('            val_b as f64 / val_a as f64');
console.log('        };');
console.log('        ');
console.log('        if ratio < 10.0 {  // 对于稳定币对，比率应该接近 1');
console.log('            return val_a;');
console.log('        }');
console.log('    }');
console.log('    ');
console.log('    0');
console.log('}');
console.log('```');
console.log();

console.log('方案 B: 使用固定偏移量（需要实际数据验证）');
console.log('```rust');
console.log('// 如果通过实际数据确定了位置，直接使用固定索引');
console.log('pub fn get_reserve_a(&self) -> u64 {');
console.log('    self.config_fields[X]  // X 需要通过分析确定');
console.log('}');
console.log('```');
console.log();

console.log('方案 C: 从 Token Vault 读取（最可靠）');
console.log('```rust');
console.log('// 需要在初始化时或定期查询 vault 账户');
console.log('pub async fn get_reserve_from_vault(');
console.log('    &self,');
console.log('    connection: &RpcClient,');
console.log('    vault_pubkey: &Pubkey,');
console.log(') -> Result<u64> {');
console.log('    let account = connection.get_account(vault_pubkey)?;');
console.log('    let token_account = TokenAccount::unpack(&account.data)?;');
console.log('    Ok(token_account.amount)');
console.log('}');
console.log('```');
console.log();

console.log('='.repeat(80));
console.log('✅ 建议');
console.log('='.repeat(80));
console.log();
console.log('短期方案: 修改启发式算法（方案 A）');
console.log('  - 添加最小值过滤 (>= 100M)');
console.log('  - 对稳定币对使用更严格的比率验证 (< 10x 而不是 < 10000x)');
console.log('  - 优先选择较大的值对');
console.log();
console.log('中期方案: 使用代理访问 RPC，运行在线分析工具');
console.log('  - 从链上读取实际数据');
console.log('  - 对比 vault 余额找到精确位置');
console.log('  - 更新代码使用固定偏移量');
console.log();
console.log('长期方案: 实现 Vault 读取（方案 C）');
console.log('  - 最可靠、最准确');
console.log('  - 适用于所有 DEX');
console.log('  - 需要增加 RPC 调用');
console.log();





