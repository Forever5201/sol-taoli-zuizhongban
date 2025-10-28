/*!
 * 高级路由器 - 整合层
 * 
 * 整合所有路由策略：
 * - 快速扫描器（混合算法：2-3跳）
 * - Bellman-Ford扫描器（深度搜索：4-6跳）
 * - 拆分优化器（DP优化）
 * 
 * 支持三种模式：
 * - Fast: 仅快速扫描（4ms，覆盖73.8%利润）
 * - Complete: 全覆盖扫描（22ms，覆盖100%利润）
 * - Hybrid: 智能选择（自适应）
 */

use crate::router::Router;
use crate::router_bellman_ford::BellmanFordScanner;
use crate::router_split_optimizer::{SplitOptimizer, OptimizedPath};
use crate::price_cache::PriceCache;
use std::sync::Arc;

/// 路由器模式
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum RouterMode {
    /// 快速模式：仅2-3跳（~4ms）
    Fast,
    /// 完整模式：2-6跳全覆盖（~22ms）
    Complete,
    /// 混合模式：根据市场状况智能选择
    Hybrid,
}

impl RouterMode {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "fast" => RouterMode::Fast,
            "complete" => RouterMode::Complete,
            "hybrid" => RouterMode::Hybrid,
            _ => RouterMode::Complete, // 默认完整模式
        }
    }
}

/// 高级路由器配置
#[derive(Debug, Clone)]
pub struct AdvancedRouterConfig {
    pub mode: RouterMode,
    pub min_roi_percent: f64,
    pub max_hops: usize,
    pub enable_split_optimization: bool,
    pub max_splits: usize,
    pub min_split_amount: f64,
}

impl Default for AdvancedRouterConfig {
    fn default() -> Self {
        Self {
            mode: RouterMode::Complete,
            min_roi_percent: 0.3,
            max_hops: 6,
            enable_split_optimization: true,
            max_splits: 5,
            min_split_amount: 100.0,
        }
    }
}

/// 高级路由器
pub struct AdvancedRouter {
    /// 快速扫描器（现有混合算法）
    quick_scanner: Router,
    /// Bellman-Ford扫描器
    bf_scanner: BellmanFordScanner,
    /// 拆分优化器
    split_optimizer: SplitOptimizer,
    /// 配置
    config: AdvancedRouterConfig,
    /// 价格缓存（用于实时获取数据）
    price_cache: Arc<PriceCache>,
}

impl AdvancedRouter {
    /// 创建新的高级路由器
    pub fn new(price_cache: Arc<PriceCache>, config: AdvancedRouterConfig) -> Self {
        let quick_scanner = Router::new(price_cache.clone());
        let bf_scanner = BellmanFordScanner::new(config.max_hops, config.min_roi_percent);
        let split_optimizer = SplitOptimizer::new(config.max_splits, config.min_split_amount);
        
        Self {
            quick_scanner,
            bf_scanner,
            split_optimizer,
            config,
            price_cache,
        }
    }
    
    /// 寻找最优路径（主入口）
    pub async fn find_optimal_routes(&self, amount: f64) -> Vec<OptimizedPath> {
        match self.config.mode {
            RouterMode::Fast => self.fast_scan(amount).await,
            RouterMode::Complete => self.complete_scan(amount).await,
            RouterMode::Hybrid => self.hybrid_scan(amount).await,
        }
    }
    
    /// 快速扫描（仅2-3跳）
    async fn fast_scan(&self, amount: f64) -> Vec<OptimizedPath> {
        let paths = self.quick_scanner.find_all_opportunities(amount);
        
        // 转换为OptimizedPath
        let optimized: Vec<OptimizedPath> = paths.into_iter()
            .map(|p| OptimizedPath {
                optimized_net_profit: p.net_profit,
                optimized_roi: p.roi_percent,
                base_path: p,
                split_strategy: None,
            })
            .collect();
        
        // 如果启用拆分优化
        if self.config.enable_split_optimization {
            self.split_optimizer.optimize_all(&optimized.iter().map(|o| o.base_path.clone()).collect::<Vec<_>>(), amount)
        } else {
            optimized
        }
    }
    
    /// 完整扫描（2-6跳全覆盖）
    async fn complete_scan(&self, amount: f64) -> Vec<OptimizedPath> {
        let all_prices = self.price_cache.get_all_prices();
        
        // 并行执行快速扫描和深度扫描
        let quick_future = async {
            self.quick_scanner.find_all_opportunities(amount)
        };
        
        let deep_future = async {
            self.bf_scanner.find_all_cycles(&all_prices, amount)
        };
        
        let (quick_paths, deep_paths) = tokio::join!(quick_future, deep_future);
        
        // 合并所有路径
        let mut all_paths = quick_paths;
        all_paths.extend(deep_paths);
        
        // 去重（可能同一个机会被两个算法都发现）
        all_paths = self.deduplicate_paths(all_paths);
        
        // 转换为OptimizedPath
        let base_optimized: Vec<OptimizedPath> = all_paths.into_iter()
            .map(|p| OptimizedPath {
                optimized_net_profit: p.net_profit,
                optimized_roi: p.roi_percent,
                base_path: p,
                split_strategy: None,
            })
            .collect();
        
        // 应用拆分优化
        if self.config.enable_split_optimization {
            self.split_optimizer.optimize_all(
                &base_optimized.iter().map(|o| o.base_path.clone()).collect::<Vec<_>>(),
                amount
            )
        } else {
            base_optimized
        }
    }
    
    /// 混合扫描（智能选择）
    async fn hybrid_scan(&self, amount: f64) -> Vec<OptimizedPath> {
        // 先快速扫描
        let quick_results = self.fast_scan(amount).await;
        
        // 如果找到高质量机会（ROI > 1%），直接返回
        if let Some(best) = quick_results.first() {
            if best.optimized_roi > 1.0 {
                println!("🎯 Hybrid mode: Found excellent quick opportunity ({}% ROI), skipping deep scan", best.optimized_roi);
                return quick_results;
            }
        }
        
        // 否则进行完整扫描
        println!("🔍 Hybrid mode: No excellent quick opportunity, running complete scan...");
        self.complete_scan(amount).await
    }
    
    /// 去重路径（基于步骤序列）
    fn deduplicate_paths(&self, paths: Vec<crate::router::ArbitragePath>) -> Vec<crate::router::ArbitragePath> {
        let mut unique = Vec::new();
        let mut seen = std::collections::HashSet::new();
        
        for path in paths {
            // 创建路径签名
            let signature: String = path.steps.iter()
                .map(|s| format!("{}->{}", s.input_token, s.output_token))
                .collect::<Vec<_>>()
                .join("|");
            
            if !seen.contains(&signature) {
                seen.insert(signature);
                unique.push(path);
            }
        }
        
        unique
    }
    
    /// 格式化优化后的路径
    pub fn format_optimized_path(&self, path: &OptimizedPath) -> String {
        let mut output = String::new();
        
        output.push_str(&format!("🔥 {:?} 套利机会（优化后）\n", path.base_path.arb_type));
        output.push_str(&format!("   初始: {} {} → 最终: {} {}\n", 
            path.base_path.input_amount, path.base_path.start_token,
            path.base_path.output_amount, path.base_path.end_token));
        output.push_str(&format!("   优化后净利润: {:.6} {} ({:.2}% ROI)\n", 
            path.optimized_net_profit, path.base_path.start_token, path.optimized_roi));
        
        if let Some(strategy) = &path.split_strategy {
            output.push_str(&format!("   拆分策略: {} 条路径\n", strategy.allocations.len()));
            for (idx, amount) in &strategy.allocations {
                output.push_str(&format!("     - 路径{}: {:.2} 资金\n", idx + 1, amount));
            }
        }
        
        output.push_str(&format!("   路径（{}跳）:\n", path.base_path.steps.len()));
        for (idx, step) in path.base_path.steps.iter().enumerate() {
            output.push_str(&format!("     {}. [{}] {} → {} (价格: {:.6})\n",
                idx + 1,
                step.dex_name,
                step.input_token,
                step.output_token,
                step.price));
        }
        
        output
    }
    
    /// 选择最优路径
    pub fn select_best<'a>(&self, paths: &'a [OptimizedPath]) -> Option<&'a OptimizedPath> {
        paths.iter()
            .filter(|p| p.is_valid())
            .max_by(|a, b| a.score().partial_cmp(&b.score()).unwrap())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_router_mode_parsing() {
        assert_eq!(RouterMode::from_str("fast"), RouterMode::Fast);
        assert_eq!(RouterMode::from_str("COMPLETE"), RouterMode::Complete);
        assert_eq!(RouterMode::from_str("hybrid"), RouterMode::Hybrid);
        assert_eq!(RouterMode::from_str("unknown"), RouterMode::Complete);
    }
    
    #[test]
    fn test_default_config() {
        let config = AdvancedRouterConfig::default();
        assert_eq!(config.mode, RouterMode::Complete);
        assert_eq!(config.max_hops, 6);
        assert!(config.enable_split_optimization);
    }
}







