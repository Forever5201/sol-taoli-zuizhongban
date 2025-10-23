-- CreateTable
CREATE TABLE "trades" (
    "id" BIGSERIAL NOT NULL,
    "signature" VARCHAR(88) NOT NULL,
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,
    "input_mint" VARCHAR(44) NOT NULL,
    "output_mint" VARCHAR(44) NOT NULL,
    "bridge_token" VARCHAR(10),
    "bridge_mint" VARCHAR(44),
    "input_amount" BIGINT NOT NULL,
    "output_amount" BIGINT NOT NULL,
    "bridge_amount" BIGINT,
    "gross_profit" BIGINT NOT NULL,
    "net_profit" BIGINT NOT NULL,
    "roi" DECIMAL(10,4),
    "flashloan_fee" BIGINT NOT NULL DEFAULT 0,
    "flashloan_amount" BIGINT NOT NULL DEFAULT 0,
    "flashloan_provider" VARCHAR(20),
    "jito_tip" BIGINT NOT NULL DEFAULT 0,
    "gas_fee" BIGINT NOT NULL DEFAULT 0,
    "priority_fee" BIGINT NOT NULL DEFAULT 0,
    "total_fee" BIGINT NOT NULL,
    "compute_units_used" INTEGER,
    "compute_unit_price" INTEGER,
    "opportunity_id" BIGINT,
    "trade_date" DATE NOT NULL,
    "hour_of_day" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" BIGSERIAL NOT NULL,
    "discovered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "input_mint" VARCHAR(44) NOT NULL,
    "output_mint" VARCHAR(44) NOT NULL,
    "bridge_token" VARCHAR(10),
    "bridge_mint" VARCHAR(44),
    "input_amount" BIGINT NOT NULL,
    "output_amount" BIGINT NOT NULL,
    "bridge_amount" BIGINT,
    "expected_profit" BIGINT NOT NULL,
    "expected_roi" DECIMAL(10,4) NOT NULL,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "trade_id" BIGINT,
    "filtered" BOOLEAN NOT NULL DEFAULT false,
    "filter_reason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_routes" (
    "id" BIGSERIAL NOT NULL,
    "trade_id" BIGINT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "dex_name" VARCHAR(50) NOT NULL,
    "pool_address" VARCHAR(44),
    "input_mint" VARCHAR(44) NOT NULL,
    "output_mint" VARCHAR(44) NOT NULL,
    "input_amount" BIGINT NOT NULL,
    "output_amount" BIGINT NOT NULL,
    "price_impact" DECIMAL(10,6),

    CONSTRAINT "trade_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_statistics" (
    "id" BIGSERIAL NOT NULL,
    "stat_date" DATE NOT NULL,
    "total_trades" INTEGER NOT NULL DEFAULT 0,
    "successful_trades" INTEGER NOT NULL DEFAULT 0,
    "failed_trades" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DECIMAL(5,2),
    "opportunities_found" INTEGER NOT NULL DEFAULT 0,
    "opportunities_executed" INTEGER NOT NULL DEFAULT 0,
    "execution_rate" DECIMAL(5,2),
    "total_gross_profit" BIGINT NOT NULL DEFAULT 0,
    "total_net_profit" BIGINT NOT NULL DEFAULT 0,
    "avg_profit_per_trade" BIGINT,
    "max_single_profit" BIGINT,
    "min_single_profit" BIGINT,
    "total_flashloan_fee" BIGINT NOT NULL DEFAULT 0,
    "total_jito_tip" BIGINT NOT NULL DEFAULT 0,
    "total_gas_fee" BIGINT NOT NULL DEFAULT 0,
    "total_fees" BIGINT NOT NULL DEFAULT 0,
    "avg_roi" DECIMAL(10,4),
    "max_roi" DECIMAL(10,4),
    "min_roi" DECIMAL(10,4),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_statistics" (
    "id" BIGSERIAL NOT NULL,
    "token_mint" VARCHAR(44) NOT NULL,
    "token_symbol" VARCHAR(10),
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_trades" INTEGER NOT NULL DEFAULT 0,
    "successful_trades" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DECIMAL(5,2),
    "total_net_profit" BIGINT NOT NULL DEFAULT 0,
    "avg_profit_per_trade" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_validations" (
    "id" BIGSERIAL NOT NULL,
    "opportunity_id" BIGINT NOT NULL,
    "first_detected_at" TIMESTAMPTZ(6) NOT NULL,
    "first_profit" BIGINT NOT NULL,
    "first_roi" DECIMAL(10,4) NOT NULL,
    "second_checked_at" TIMESTAMPTZ(6) NOT NULL,
    "still_exists" BOOLEAN NOT NULL,
    "second_profit" BIGINT,
    "second_roi" DECIMAL(10,4),
    "validation_delay_ms" INTEGER NOT NULL,

    CONSTRAINT "opportunity_validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trades_signature_key" ON "trades"("signature");

-- CreateIndex
CREATE INDEX "trades_executed_at_idx" ON "trades"("executed_at" DESC);

-- CreateIndex
CREATE INDEX "trades_status_idx" ON "trades"("status");

-- CreateIndex
CREATE INDEX "trades_trade_date_idx" ON "trades"("trade_date" DESC);

-- CreateIndex
CREATE INDEX "trades_input_mint_idx" ON "trades"("input_mint");

-- CreateIndex
CREATE INDEX "trades_bridge_token_idx" ON "trades"("bridge_token");

-- CreateIndex
CREATE INDEX "trades_net_profit_idx" ON "trades"("net_profit" DESC);

-- CreateIndex
CREATE INDEX "trades_roi_idx" ON "trades"("roi" DESC);

-- CreateIndex
CREATE INDEX "opportunities_discovered_at_idx" ON "opportunities"("discovered_at" DESC);

-- CreateIndex
CREATE INDEX "opportunities_executed_idx" ON "opportunities"("executed");

-- CreateIndex
CREATE INDEX "opportunities_expected_profit_idx" ON "opportunities"("expected_profit" DESC);

-- CreateIndex
CREATE INDEX "opportunities_input_mint_idx" ON "opportunities"("input_mint");

-- CreateIndex
CREATE INDEX "opportunities_bridge_token_idx" ON "opportunities"("bridge_token");

-- CreateIndex
CREATE INDEX "trade_routes_trade_id_idx" ON "trade_routes"("trade_id");

-- CreateIndex
CREATE INDEX "trade_routes_dex_name_idx" ON "trade_routes"("dex_name");

-- CreateIndex
CREATE UNIQUE INDEX "trade_routes_trade_id_step_number_direction_key" ON "trade_routes"("trade_id", "step_number", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "daily_statistics_stat_date_key" ON "daily_statistics"("stat_date");

-- CreateIndex
CREATE INDEX "daily_statistics_stat_date_idx" ON "daily_statistics"("stat_date" DESC);

-- CreateIndex
CREATE INDEX "token_statistics_token_mint_idx" ON "token_statistics"("token_mint");

-- CreateIndex
CREATE INDEX "token_statistics_period_start_period_end_idx" ON "token_statistics"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "token_statistics_token_mint_period_start_period_end_key" ON "token_statistics"("token_mint", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_validations_opportunity_id_key" ON "opportunity_validations"("opportunity_id");

-- CreateIndex
CREATE INDEX "opportunity_validations_first_detected_at_idx" ON "opportunity_validations"("first_detected_at" DESC);

-- CreateIndex
CREATE INDEX "opportunity_validations_still_exists_idx" ON "opportunity_validations"("still_exists");

-- CreateIndex
CREATE INDEX "opportunity_validations_validation_delay_ms_idx" ON "opportunity_validations"("validation_delay_ms");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_routes" ADD CONSTRAINT "trade_routes_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_validations" ADD CONSTRAINT "opportunity_validations_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
