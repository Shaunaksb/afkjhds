#!/usr/bin/env python3
"""
Seed script to ingest January 2026 Elexon wind data (actuals & forecasts)
into the bundled SQLite database.
"""
import sys
import os
import logging
from datetime import datetime, timezone, timedelta

# Add current dir to path
sys.path.insert(0, os.path.dirname(__file__))

from db import init_db, upsert_actuals, upsert_forecasts, get_db_stats
from elexon_service import fetch_actual_wind_stream, fetch_wind_forecast_stream

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed")

def run_seed(days_to_fetch: int = 31):
    init_db()
    stats_before = get_db_stats()
    logger.info(f"DB Status before seed: {stats_before}")

    start_date = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    end_date = start_date + timedelta(days=days_to_fetch)

    # 1. Fetch Actuals in chunks of 5 days
    logger.info("Starting ingestion of FUELHH actuals...")
    curr = start_date
    total_actuals = 0
    while curr < end_date:
        chunk_end = min(curr + timedelta(days=5), end_date)
        logger.info(f"Fetching actuals from {curr.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')}...")
        actuals = fetch_actual_wind_stream(curr, chunk_end)
        if actuals:
            upsert_actuals(actuals)
            total_actuals += len(actuals)
            logger.info(f"Upserted {len(actuals)} actual records (Total: {total_actuals})")
        curr = chunk_end + timedelta(seconds=1)

    # 2. Fetch Forecasts in chunks of 3 days (starting 2 days earlier to cover D-1)
    logger.info("Starting ingestion of WINDFOR forecasts...")
    curr = start_date - timedelta(days=2)
    total_forecasts = 0
    while curr < end_date:
        chunk_end = min(curr + timedelta(days=3), end_date)
        logger.info(f"Fetching forecasts from {curr.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')}...")
        forecasts = fetch_wind_forecast_stream(curr, chunk_end)
        if forecasts:
            upsert_forecasts(forecasts)
            total_forecasts += len(forecasts)
            logger.info(f"Upserted {len(forecasts)} forecast records (Total: {total_forecasts})")
        curr = chunk_end + timedelta(seconds=1)

    stats_after = get_db_stats()
    logger.info(f"DB Seeding Completed! Stats: {stats_after}")

if __name__ == "__main__":
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 31
    run_seed(days)
