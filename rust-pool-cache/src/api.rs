use axum::{
    extract::State,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use crate::arbitrage::{scan_for_arbitrage, ArbitrageOpportunity};
use crate::price_cache::PriceCache;

/// API State shared across handlers
#[derive(Clone)]
pub struct ApiState {
    pub price_cache: Arc<PriceCache>,
}

/// Response for health check
#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    cached_pools: usize,
    cached_pairs: Vec<String>,
}

/// Response for price query
#[derive(Serialize)]
pub struct PriceResponse {
    pool_id: String,
    dex_name: String,
    pair: String,
    price: f64,
    base_reserve: u64,
    quote_reserve: u64,
    age_ms: u128,
}

/// Response for arbitrage scan
#[derive(Serialize)]
pub struct ArbitrageResponse {
    opportunities: Vec<ArbitrageOpportunityDto>,
    count: usize,
}

#[derive(Serialize)]
pub struct ArbitrageOpportunityDto {
    pool_a_id: String,
    pool_a_dex: String,
    pool_a_price: f64,
    pool_b_id: String,
    pool_b_dex: String,
    pool_b_price: f64,
    pair: String,
    price_diff_pct: f64,
    estimated_profit_pct: f64,
    age_ms: u128,
}

impl From<ArbitrageOpportunity> for ArbitrageOpportunityDto {
    fn from(opp: ArbitrageOpportunity) -> Self {
        Self {
            pool_a_id: opp.pool_a_id,
            pool_a_dex: opp.pool_a_dex,
            pool_a_price: opp.pool_a_price,
            pool_b_id: opp.pool_b_id,
            pool_b_dex: opp.pool_b_dex,
            pool_b_price: opp.pool_b_price,
            pair: opp.pair,
            price_diff_pct: opp.price_diff_pct,
            estimated_profit_pct: opp.estimated_profit_pct,
            age_ms: opp.detected_at.elapsed().as_millis(),
        }
    }
}

/// Request for arbitrage scan
#[derive(Deserialize)]
pub struct ScanRequest {
    #[serde(default = "default_threshold")]
    threshold_pct: f64,
}

fn default_threshold() -> f64 {
    0.5 // Default 0.5% threshold
}

/// GET /health - Health check endpoint
async fn health(State(state): State<ApiState>) -> Json<HealthResponse> {
    let (cached_pools, cached_pairs) = state.price_cache.get_stats();
    
    Json(HealthResponse {
        status: "ok".to_string(),
        cached_pools,
        cached_pairs,
    })
}

/// GET /prices - Get all cached prices
async fn get_all_prices(State(state): State<ApiState>) -> Json<Vec<PriceResponse>> {
    let prices = state.price_cache.get_all_prices();
    
    let response: Vec<PriceResponse> = prices
        .into_iter()
        .map(|p| PriceResponse {
            pool_id: p.pool_id.clone(),
            dex_name: p.dex_name.clone(),
            pair: p.pair.clone(),
            price: p.price,
            base_reserve: p.base_reserve,
            quote_reserve: p.quote_reserve,
            age_ms: p.last_update.elapsed().as_millis(),
        })
        .collect();
    
    Json(response)
}

/// GET /prices/:pair - Get prices for a specific pair
async fn get_pair_prices(
    axum::extract::Path(pair): axum::extract::Path<String>,
    State(state): State<ApiState>,
) -> Json<Vec<PriceResponse>> {
    let prices = state.price_cache.get_pools_by_pair(&pair);
    
    let response: Vec<PriceResponse> = prices
        .into_iter()
        .map(|p| PriceResponse {
            pool_id: p.pool_id.clone(),
            dex_name: p.dex_name.clone(),
            pair: p.pair.clone(),
            price: p.price,
            base_reserve: p.base_reserve,
            quote_reserve: p.quote_reserve,
            age_ms: p.last_update.elapsed().as_millis(),
        })
        .collect();
    
    Json(response)
}

/// POST /scan-arbitrage - Scan for arbitrage opportunities
async fn scan_arbitrage(
    State(state): State<ApiState>,
    Json(req): Json<ScanRequest>,
) -> Json<ArbitrageResponse> {
    let opportunities = scan_for_arbitrage(&state.price_cache, req.threshold_pct);
    
    let count = opportunities.len();
    let opportunities: Vec<ArbitrageOpportunityDto> = opportunities
        .into_iter()
        .map(|o| o.into())
        .collect();
    
    Json(ArbitrageResponse {
        opportunities,
        count,
    })
}

/// Create the API router
pub fn create_router(price_cache: Arc<PriceCache>) -> Router {
    let state = ApiState { price_cache };
    
    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    
    Router::new()
        .route("/health", get(health))
        .route("/prices", get(get_all_prices))
        .route("/prices/:pair", get(get_pair_prices))
        .route("/scan-arbitrage", post(scan_arbitrage))
        .layer(cors)
        .with_state(state)
}

/// Start the API server
pub async fn start_api_server(
    price_cache: Arc<PriceCache>,
    port: u16,
) -> anyhow::Result<()> {
    let app = create_router(price_cache);
    
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    println!("🌐 HTTP API server listening on http://0.0.0.0:{}", port);
    println!("   Endpoints:");
    println!("     GET  /health");
    println!("     GET  /prices");
    println!("     GET  /prices/:pair");
    println!("     POST /scan-arbitrage");
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    
    Ok(())
}


