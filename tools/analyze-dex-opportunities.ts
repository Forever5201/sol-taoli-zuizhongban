import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:19491001@localhost:5432/flashloan_bot";

async function analyzeDexOpportunities() {
    const pool = new Pool({ connectionString: DATABASE_URL });
    
    try {
        console.log('\n=== 📊 过去 7 天套利机会统计（按 DEX 组合） ===\n');
        
        const query = `
            SELECT 
                dex_a, 
                dex_b, 
                COUNT(*) as opportunity_count,
                AVG(profit_lamports) as avg_profit,
                MAX(profit_lamports) as max_profit,
                MIN(profit_lamports) as min_profit
            FROM arbitrage_opportunities 
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY dex_a, dex_b 
            ORDER BY opportunity_count DESC 
            LIMIT 20
        `;
        
        const result = await pool.query(query);
        
        if (result.rows.length === 0) {
            console.log('❌ 过去 7 天没有记录的套利机会');
            
            // Try to get any opportunities
            const anyQuery = `
                SELECT 
                    dex_a, 
                    dex_b, 
                    COUNT(*) as opportunity_count,
                    AVG(profit_lamports) as avg_profit,
                    MAX(profit_lamports) as max_profit
                FROM arbitrage_opportunities 
                GROUP BY dex_a, dex_b 
                ORDER BY opportunity_count DESC 
                LIMIT 20
            `;
            
            const anyResult = await pool.query(anyQuery);
            
            if (anyResult.rows.length > 0) {
                console.log('\n=== 📊 所有历史套利机会统计 ===\n');
                console.log('DEX A           → DEX B           | 机会数 | 平均利润(SOL) | 最大利润(SOL)');
                console.log('─'.repeat(85));
                
                anyResult.rows.forEach(row => {
                    const avgProfit = (Number(row.avg_profit) / 1e9).toFixed(6);
                    const maxProfit = (Number(row.max_profit) / 1e9).toFixed(6);
                    console.log(
                        `${row.dex_a.padEnd(15)} → ${row.dex_b.padEnd(15)} | ` +
                        `${String(row.opportunity_count).padStart(6)} | ` +
                        `${avgProfit.padStart(14)} | ` +
                        `${maxProfit.padStart(14)}`
                    );
                });
            } else {
                console.log('❌ 数据库中没有任何套利机会记录');
            }
        } else {
            console.log('DEX A           → DEX B           | 机会数 | 平均利润(SOL) | 最大利润(SOL) | 最小利润(SOL)');
            console.log('─'.repeat(95));
            
            result.rows.forEach(row => {
                const avgProfit = (Number(row.avg_profit) / 1e9).toFixed(6);
                const maxProfit = (Number(row.max_profit) / 1e9).toFixed(6);
                const minProfit = (Number(row.min_profit) / 1e9).toFixed(6);
                console.log(
                    `${row.dex_a.padEnd(15)} → ${row.dex_b.padEnd(15)} | ` +
                    `${String(row.opportunity_count).padStart(6)} | ` +
                    `${avgProfit.padStart(14)} | ` +
                    `${maxProfit.padStart(14)} | ` +
                    `${minProfit.padStart(14)}`
                );
            });
        }
        
        // Get unique DEX list
        console.log('\n\n=== 🎯 DEX 优先级排序 ===\n');
        
        const dexQuery = `
            SELECT 
                dex,
                COUNT(*) as total_opportunities,
                AVG(profit_lamports) as avg_profit
            FROM (
                SELECT dex_a as dex, profit_lamports FROM arbitrage_opportunities
                UNION ALL
                SELECT dex_b as dex, profit_lamports FROM arbitrage_opportunities
            ) combined
            GROUP BY dex
            ORDER BY total_opportunities DESC
        `;
        
        const dexResult = await pool.query(dexQuery);
        
        if (dexResult.rows.length > 0) {
            console.log('排名 | DEX 名称        | 涉及机会数 | 平均利润(SOL)');
            console.log('─'.repeat(60));
            
            dexResult.rows.forEach((row, index) => {
                const avgProfit = (Number(row.avg_profit) / 1e9).toFixed(6);
                console.log(
                    `${String(index + 1).padStart(4)} | ` +
                    `${row.dex.padEnd(15)} | ` +
                    `${String(row.total_opportunities).padStart(10)} | ` +
                    `${avgProfit.padStart(14)}`
                );
            });
            
            console.log('\n💡 建议接入顺序：按照上表从上到下的顺序');
        }
        
    } catch (error) {
        console.error('❌ 查询失败:', error);
    } finally {
        await pool.end();
    }
}

analyzeDexOpportunities();



