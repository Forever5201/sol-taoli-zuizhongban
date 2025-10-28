#!/usr/bin/env python3
"""
简单的Python脚本用于记录套利机会到PostgreSQL
临时解决方案，直到Rust依赖冲突解决

使用方法:
    python record_opportunity.py --roi 0.45 --path "USDC→SOL→USDT→USDC"
"""

import psycopg2
from datetime import datetime
import argparse

# 数据库连接配置
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'Yuan971035088'
}

def record_opportunity(
    arbitrage_type,
    start_token,
    end_token,
    input_amount,
    output_amount,
    gross_profit,
    net_profit,
    roi_percent,
    estimated_fees,
    hop_count,
    path_summary,
    router_mode='Complete',
    min_roi_threshold=0.3
):
    """记录套利机会到数据库"""
    
    try:
        # 连接数据库
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # 插入机会
        cur.execute("""
            INSERT INTO arbitrage_opportunities (
                discovered_at,
                arbitrage_type,
                start_token,
                end_token,
                input_amount,
                output_amount,
                gross_profit,
                net_profit,
                roi_percent,
                estimated_fees,
                hop_count,
                path_summary,
                router_mode,
                min_roi_threshold
            ) VALUES (
                NOW(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id
        """, (
            arbitrage_type,
            start_token,
            end_token,
            input_amount,
            output_amount,
            gross_profit,
            net_profit,
            roi_percent,
            estimated_fees,
            hop_count,
            path_summary,
            router_mode,
            min_roi_threshold
        ))
        
        opp_id = cur.fetchone()[0]
        
        # 提交
        conn.commit()
        
        print(f"✅ 机会 #{opp_id} 已记录")
        print(f"   ROI: {roi_percent:.4f}%")
        print(f"   路径: {path_summary}")
        
        # 关闭连接
        cur.close()
        conn.close()
        
        return opp_id
        
    except Exception as e:
        print(f"❌ 记录失败: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description='记录套利机会到数据库')
    parser.add_argument('--roi', type=float, required=True, help='ROI百分比')
    parser.add_argument('--path', required=True, help='路径摘要 (如: USDC→SOL→USDT→USDC)')
    parser.add_argument('--input', type=float, default=1000.0, help='输入金额')
    parser.add_argument('--type', default='Triangle', choices=['Direct', 'Triangle', 'MultiHop'], help='套利类型')
    parser.add_argument('--mode', default='Complete', help='路由模式')
    
    args = parser.parse_args()
    
    # 计算金额
    input_amount = args.input
    output_amount = input_amount * (1 + args.roi / 100)
    gross_profit = output_amount - input_amount
    estimated_fees = gross_profit * 0.1  # 假设10%费用
    net_profit = gross_profit - estimated_fees
    
    # 从路径计算跳数
    hop_count = args.path.count('→')
    
    # 从路径提取代币
    tokens = args.path.split('→')
    start_token = tokens[0].strip()
    end_token = tokens[-1].strip()
    
    # 记录
    record_opportunity(
        arbitrage_type=args.type,
        start_token=start_token,
        end_token=end_token,
        input_amount=input_amount,
        output_amount=output_amount,
        gross_profit=gross_profit,
        net_profit=net_profit,
        roi_percent=args.roi,
        estimated_fees=estimated_fees,
        hop_count=hop_count,
        path_summary=args.path,
        router_mode=args.mode
    )

if __name__ == '__main__':
    main()


"""
简单的Python脚本用于记录套利机会到PostgreSQL
临时解决方案，直到Rust依赖冲突解决

使用方法:
    python record_opportunity.py --roi 0.45 --path "USDC→SOL→USDT→USDC"
"""

import psycopg2
from datetime import datetime
import argparse

# 数据库连接配置
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'Yuan971035088'
}

def record_opportunity(
    arbitrage_type,
    start_token,
    end_token,
    input_amount,
    output_amount,
    gross_profit,
    net_profit,
    roi_percent,
    estimated_fees,
    hop_count,
    path_summary,
    router_mode='Complete',
    min_roi_threshold=0.3
):
    """记录套利机会到数据库"""
    
    try:
        # 连接数据库
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # 插入机会
        cur.execute("""
            INSERT INTO arbitrage_opportunities (
                discovered_at,
                arbitrage_type,
                start_token,
                end_token,
                input_amount,
                output_amount,
                gross_profit,
                net_profit,
                roi_percent,
                estimated_fees,
                hop_count,
                path_summary,
                router_mode,
                min_roi_threshold
            ) VALUES (
                NOW(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id
        """, (
            arbitrage_type,
            start_token,
            end_token,
            input_amount,
            output_amount,
            gross_profit,
            net_profit,
            roi_percent,
            estimated_fees,
            hop_count,
            path_summary,
            router_mode,
            min_roi_threshold
        ))
        
        opp_id = cur.fetchone()[0]
        
        # 提交
        conn.commit()
        
        print(f"✅ 机会 #{opp_id} 已记录")
        print(f"   ROI: {roi_percent:.4f}%")
        print(f"   路径: {path_summary}")
        
        # 关闭连接
        cur.close()
        conn.close()
        
        return opp_id
        
    except Exception as e:
        print(f"❌ 记录失败: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description='记录套利机会到数据库')
    parser.add_argument('--roi', type=float, required=True, help='ROI百分比')
    parser.add_argument('--path', required=True, help='路径摘要 (如: USDC→SOL→USDT→USDC)')
    parser.add_argument('--input', type=float, default=1000.0, help='输入金额')
    parser.add_argument('--type', default='Triangle', choices=['Direct', 'Triangle', 'MultiHop'], help='套利类型')
    parser.add_argument('--mode', default='Complete', help='路由模式')
    
    args = parser.parse_args()
    
    # 计算金额
    input_amount = args.input
    output_amount = input_amount * (1 + args.roi / 100)
    gross_profit = output_amount - input_amount
    estimated_fees = gross_profit * 0.1  # 假设10%费用
    net_profit = gross_profit - estimated_fees
    
    # 从路径计算跳数
    hop_count = args.path.count('→')
    
    # 从路径提取代币
    tokens = args.path.split('→')
    start_token = tokens[0].strip()
    end_token = tokens[-1].strip()
    
    # 记录
    record_opportunity(
        arbitrage_type=args.type,
        start_token=start_token,
        end_token=end_token,
        input_amount=input_amount,
        output_amount=output_amount,
        gross_profit=gross_profit,
        net_profit=net_profit,
        roi_percent=args.roi,
        estimated_fees=estimated_fees,
        hop_count=hop_count,
        path_summary=args.path,
        router_mode=args.mode
    )

if __name__ == '__main__':
    main()















