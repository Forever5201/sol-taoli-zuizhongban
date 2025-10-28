use chrono::{DateTime, Utc};
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

#[derive(Clone, Debug)]
pub struct LatencyMeasurement {
    pub timestamp: DateTime<Utc>,
    pub latency_micros: u64,
    #[allow(dead_code)]
    pub pool_name: String,
}

#[derive(Clone)]
pub struct MetricsCollector {
    measurements: Arc<Mutex<VecDeque<LatencyMeasurement>>>,
    max_measurements: usize,
}

impl MetricsCollector {
    pub fn new(max_measurements: usize) -> Self {
        Self {
            measurements: Arc::new(Mutex::new(VecDeque::with_capacity(max_measurements))),
            max_measurements,
        }
    }
    
    /// Record a new latency measurement
    pub fn record(&self, pool_name: String, latency_micros: u64) {
        let measurement = LatencyMeasurement {
            timestamp: Utc::now(),
            latency_micros,
            pool_name,
        };
        
        let mut measurements = self.measurements.lock().unwrap();
        
        // Keep only the most recent measurements
        if measurements.len() >= self.max_measurements {
            measurements.pop_front();
        }
        
        measurements.push_back(measurement);
    }
    
    /// Get statistics for the last N seconds
    pub fn get_stats(&self, last_seconds: i64) -> MetricsStats {
        let measurements = self.measurements.lock().unwrap();
        let cutoff = Utc::now() - chrono::Duration::seconds(last_seconds);
        
        let recent: Vec<_> = measurements
            .iter()
            .filter(|m| m.timestamp > cutoff)
            .collect();
        
        if recent.is_empty() {
            return MetricsStats::default();
        }
        
        let mut latencies: Vec<u64> = recent.iter().map(|m| m.latency_micros).collect();
        latencies.sort_unstable();
        
        let count = latencies.len();
        let sum: u64 = latencies.iter().sum();
        let avg = sum / count as u64;
        
        let p50 = latencies[count / 2];
        let p95 = latencies[(count * 95) / 100];
        let p99 = latencies[(count * 99) / 100];
        
        let min = *latencies.first().unwrap();
        let max = *latencies.last().unwrap();
        
        let update_rate = count as f64 / last_seconds as f64;
        
        MetricsStats {
            total_updates: count,
            avg_latency_micros: avg,
            p50_latency_micros: p50,
            p95_latency_micros: p95,
            p99_latency_micros: p99,
            min_latency_micros: min,
            max_latency_micros: max,
            update_rate_per_second: update_rate,
        }
    }
    
    /// Print a formatted statistics report
    pub fn print_stats(&self, last_seconds: i64) {
        let stats = self.get_stats(last_seconds);
        
        println!("\n┌───────────────────────────────────────────────────────┐");
        println!("│  Statistics - Last {} seconds                       │", last_seconds);
        println!("├───────────────────────────────────────────────────────┤");
        println!("│  Total Updates:     {:>8}                         │", stats.total_updates);
        println!("│  Update Rate:       {:>8.2} updates/sec             │", stats.update_rate_per_second);
        println!("├───────────────────────────────────────────────────────┤");
        println!("│  Latency (microseconds):                            │");
        println!("│    Average:         {:>8.2} μs ({:.2} ms)          │", 
                 stats.avg_latency_micros, stats.avg_latency_micros as f64 / 1000.0);
        println!("│    Min:             {:>8.2} μs ({:.2} ms)          │", 
                 stats.min_latency_micros, stats.min_latency_micros as f64 / 1000.0);
        println!("│    P50:             {:>8.2} μs ({:.2} ms)          │", 
                 stats.p50_latency_micros, stats.p50_latency_micros as f64 / 1000.0);
        println!("│    P95:             {:>8.2} μs ({:.2} ms)          │", 
                 stats.p95_latency_micros, stats.p95_latency_micros as f64 / 1000.0);
        println!("│    P99:             {:>8.2} μs ({:.2} ms)          │", 
                 stats.p99_latency_micros, stats.p99_latency_micros as f64 / 1000.0);
        println!("│    Max:             {:>8.2} μs ({:.2} ms)          │", 
                 stats.max_latency_micros, stats.max_latency_micros as f64 / 1000.0);
        println!("└───────────────────────────────────────────────────────┘\n");
    }
}

#[derive(Debug, Clone, Default)]
pub struct MetricsStats {
    pub total_updates: usize,
    pub avg_latency_micros: u64,
    pub p50_latency_micros: u64,
    pub p95_latency_micros: u64,
    pub p99_latency_micros: u64,
    pub min_latency_micros: u64,
    pub max_latency_micros: u64,
    pub update_rate_per_second: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;
    
    #[test]
    fn test_metrics_recording() {
        let collector = MetricsCollector::new(100);
        
        collector.record("SOL/USDC".to_string(), 1000);
        collector.record("SOL/USDC".to_string(), 2000);
        collector.record("SOL/USDC".to_string(), 3000);
        
        thread::sleep(Duration::from_millis(10));
        
        let stats = collector.get_stats(60);
        assert_eq!(stats.total_updates, 3);
        assert_eq!(stats.avg_latency_micros, 2000);
    }
}



