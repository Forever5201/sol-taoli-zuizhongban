# 4 Workers + USDC/USDT Only - Stability Test Results

## Test Configuration

**Start Time**: 2025-10-23 (Current Time)
**Test Duration**: 30 minutes
**Worker Count**: 4
**Query Interval**: 3000ms (3 seconds)
**Bridge Tokens**: USDC, USDT only (mSOL and jitoSOL disabled)

## Test Hypothesis

If this test achieves 95%+ success rate with only USDC/USDT enabled, it will prove:
- ✅ Ultra API endpoint `https://api.jup.ag/ultra/v1/order` is correctly configured
- ✅ 4 Workers concurrent architecture is stable
- ✅ Rate limiting (54% utilization, 26.67 calls/10s < 50 limit) is appropriate
- ✅ Previous "No route found" errors were specifically due to Ultra API's conservative handling of staked tokens (mSOL/jitoSOL) without taker parameter

## Configuration Changes

### bridge-tokens.json
```json
mSOL: enabled: false   // Previously: true
jitoSOL: enabled: false // Previously: true
USDC: enabled: true    // Unchanged
USDT: enabled: true    // Unchanged
```

### Expected Worker Distribution
Since only 2 tokens are enabled with 4 workers:
- Worker 0 → USDC
- Worker 1 → USDT
- Worker 2 → USDC (round-robin)
- Worker 3 → USDT (round-robin)

## Monitoring Checkpoints

### ⏱️ T+10 Minutes (Check at: _________)
**Success Criteria**:
- [ ] Success Rate > 80%
- [ ] Network Errors < 20%
- [ ] "No route found" errors < 10%
- [ ] All 4 Workers running normally

**Status**: _______________
**Actual Metrics**:
- Success Rate: _________
- Opportunities Found: _________
- Network Errors: _________
- "No route found": _________

**Decision**: [ ] Continue  [ ] Rollback

---

### ⏱️ T+20 Minutes (Check at: _________)
**Success Criteria**:
- [ ] Success Rate > 85%
- [ ] Network Errors < 15%
- [ ] "No route found" errors < 5%
- [ ] Consistent opportunity discovery

**Status**: _______________
**Actual Metrics**:
- Success Rate: _________
- Opportunities Found: _________
- Network Errors: _________
- "No route found": _________

**Decision**: [ ] Continue  [ ] Rollback

---

### ⏱️ T+30 Minutes (Final Check at: _________)
**Success Criteria**:
- [ ] Success Rate ≥ 95%
- [ ] Network Errors < 10%
- [ ] "No route found" errors < 3%
- [ ] Opportunities Found ≥ 20

**Status**: _______________
**Actual Metrics**:
- Success Rate: _________
- Opportunities Found: _________
- Total Queries: _________
- Network Errors: _________
- "No route found": _________
- Average Latency: _________

**Final Decision**: [ ] Test PASSED - Commit changes  [ ] Test FAILED - Rollback

---

## Key Metrics to Track

From worker logs, look for:

```
📊 Statistics (Every 10 rounds):
   Queries: XX total (XX success, XX failed)
   Success Rate: XX.X% (XX/XX)
   Outbound: XX.Xms avg (min XX.Xms, max XX.Xms)
   Return: XX.Xms avg (min XX.Xms, max XX.Xms)
   Opportunities: X found
   
   By Token:
     USDC: XX/XX success (XX.X%)
     USDT: XX/XX success (XX.X%)
```

## Log Analysis Template

### Positive Indicators ✅
- [ ] Consistent "✅" success messages for both USDC and USDT
- [ ] Opportunity discovery messages: "💰 Arbitrage opportunity found!"
- [ ] Stable latency (outbound + return < 500ms average)
- [ ] No "ECONNRESET" errors
- [ ] No "429 Rate Limit" errors

### Negative Indicators ⚠️
- [ ] Frequent "⚠️ No route found" messages
- [ ] "🌐 Network Error: read ECONNRESET"
- [ ] "❌ Request failed with status code 429"
- [ ] Workers hanging or not producing output
- [ ] Success rate declining over time

## Root Cause Analysis

### If Test PASSES (Success Rate ≥ 95%)
**Confirmed Root Cause**: 
- Ultra API's `/v1/order` endpoint without `taker` parameter returns conservative "No route found" for complex staked token routes (mSOL/jitoSOL) with large query amounts (10 SOL)
- High-liquidity stablecoins (USDC/USDT) have simpler single-hop routes that Ultra API can quote accurately without taker parameter

**Architecture Validation**:
- ✅ 4 Workers concurrent design is correct
- ✅ Ultra API endpoint is correct
- ✅ Rate limiting calculation is accurate
- ✅ Proxy configuration is stable

**Next Steps**:
1. Option A: Continue with USDC+USDT (covers majority of arbitrage opportunities)
2. Option B: Implement `taker` parameter support to re-enable mSOL/jitoSOL

### If Test FAILS (Success Rate < 95%)
**Potential Issues**:
- Rate limiting still too aggressive
- Proxy instability affecting all tokens
- Network connectivity issues
- Ultra API having broader issues

**Next Steps**:
1. Analyze specific failure patterns
2. Consider reducing to 2 Workers
3. Increase query_interval_ms to 5000ms
4. Review proxy logs for connection issues

## Final Conclusion

**Test Result**: [ ] PASSED  [ ] FAILED

**Key Findings**:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Recommendations**:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Git Commit Message** (if test passes):
```
feat: Verify 4 Workers + USDC/USDT achieves 95%+ success rate

- Disabled mSOL and jitoSOL (Ultra API needs taker parameter for staked tokens)
- Confirmed 4 Workers architecture is stable
- Success Rate: XX.X% over 30 minutes
- Opportunities Found: XX
- Root Cause: Ultra API without taker parameter conservative on complex routes
```

---

## Test Started
**Command**: `pnpm run flashloan-dryrun`
**Background Process**: Running
**Monitor Command**: Check logs in console output

**Test in Progress... Monitor for 30 minutes and fill in metrics above.**

