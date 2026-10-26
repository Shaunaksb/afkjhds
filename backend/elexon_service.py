import requests
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
HEADERS = {
    "User-Agent": "Gridbricks-Wind-Procurement-Platform/1.0 (Energy Trading Desk)"
}

def fetch_actual_wind_stream(start_dt: datetime, end_dt: datetime) -> List[Dict[str, Any]]:
    """
    Fetches actual wind generation from FUELHH/stream endpoint.
    Filters for fuelType == 'WIND'.
    """
    url = f"{ELEXON_BASE_URL}/datasets/FUELHH/stream"
    params = {
        "publishDateTimeFrom": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "publishDateTimeTo": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        
        wind_records = []
        for item in data:
            if item.get("fuelType", "").upper() == "WIND":
                wind_records.append({
                    "startTime": item.get("startTime"),
                    "settlementDate": item.get("settlementDate"),
                    "settlementPeriod": item.get("settlementPeriod"),
                    "generation": float(item.get("generation", 0.0))
                })
        return wind_records
    except Exception as e:
        logger.error(f"Failed to fetch FUELHH stream: {e}")
        return []

def fetch_wind_forecast_stream(start_dt: datetime, end_dt: datetime) -> List[Dict[str, Any]]:
    """
    Fetches forecasted wind generation from WINDFOR/stream endpoint.
    """
    url = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream"
    params = {
        "publishDateTimeFrom": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "publishDateTimeTo": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        forecast_records = []
        for item in data:
            if "startTime" in item and "publishTime" in item and "generation" in item:
                forecast_records.append({
                    "startTime": item.get("startTime"),
                    "publishTime": item.get("publishTime"),
                    "generation": float(item.get("generation", 0.0))
                })
        return forecast_records
    except Exception as e:
        logger.error(f"Failed to fetch WINDFOR stream: {e}")
        return []

def sync_elexon_range(start_date_str: str, end_date_str: str, chunk_days: int = 3, progress_callback=None) -> Dict[str, int]:
    """
    Synchronizes both FUELHH and WINDFOR streams chunk by chunk into local SQLite.
    start_date_str: '2026-01-01'
    end_date_str: '2026-01-31'
    """
    from db import upsert_actuals, upsert_forecasts, init_db

    init_db()

    start_dt = datetime.strptime(start_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end_dt = datetime.strptime(end_date_str, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)

    # For forecasts, look back 2 days prior to start_dt to capture D-1 day-ahead forecasts
    forecast_start_dt = start_dt - timedelta(days=2)

    total_actuals = 0
    total_forecasts = 0

    curr_actual = start_dt
    while curr_actual < end_dt:
        chunk_end = min(curr_actual + timedelta(days=chunk_days), end_dt)
        logger.info(f"Fetching FUELHH from {curr_actual.isoformat()} to {chunk_end.isoformat()}...")
        actuals = fetch_actual_wind_stream(curr_actual, chunk_end)
        upsert_actuals(actuals)
        total_actuals += len(actuals)
        if progress_callback:
            progress_callback(f"Synced {len(actuals)} actuals for {curr_actual.strftime('%Y-%m-%d')}")
        curr_actual = chunk_end + timedelta(seconds=1)

    curr_fc = forecast_start_dt
    while curr_fc < end_dt:
        chunk_end = min(curr_fc + timedelta(days=chunk_days), end_dt)
        logger.info(f"Fetching WINDFOR from {curr_fc.isoformat()} to {chunk_end.isoformat()}...")
        forecasts = fetch_wind_forecast_stream(curr_fc, chunk_end)
        upsert_forecasts(forecasts)
        total_forecasts += len(forecasts)
        if progress_callback:
            progress_callback(f"Synced {len(forecasts)} forecasts for {curr_fc.strftime('%Y-%m-%d')}")
        curr_fc = chunk_end + timedelta(seconds=1)

    return {
        "actualsSynced": total_actuals,
        "forecastsSynced": total_forecasts
    }
