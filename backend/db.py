import sqlite3
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "wind_data_jan2026.db")

def get_db_connection(db_path: str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db(db_path: str = DEFAULT_DB_PATH):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS actual_generation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        settlement_date TEXT NOT NULL,
        settlement_period INTEGER NOT NULL,
        generation REAL NOT NULL,
        UNIQUE(start_time, settlement_period)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS forecast_generation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        publish_time TEXT NOT NULL,
        generation REAL NOT NULL,
        UNIQUE(start_time, publish_time)
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_actual_start ON actual_generation(start_time);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_actual_date ON actual_generation(settlement_date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_start_pub ON forecast_generation(start_time, publish_time);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_pub ON forecast_generation(publish_time);")
    
    conn.commit()
    conn.close()

def upsert_actuals(records: List[Dict[str, Any]], db_path: str = DEFAULT_DB_PATH):
    if not records:
        return
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.executemany("""
    INSERT INTO actual_generation (start_time, settlement_date, settlement_period, generation)
    VALUES (:startTime, :settlementDate, :settlementPeriod, :generation)
    ON CONFLICT(start_time, settlement_period) DO UPDATE SET
        generation = excluded.generation;
    """, records)
    conn.commit()
    conn.close()

def upsert_forecasts(records: List[Dict[str, Any]], db_path: str = DEFAULT_DB_PATH):
    if not records:
        return
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.executemany("""
    INSERT INTO forecast_generation (start_time, publish_time, generation)
    VALUES (:startTime, :publishTime, :generation)
    ON CONFLICT(start_time, publish_time) DO UPDATE SET
        generation = excluded.generation;
    """, records)
    conn.commit()
    conn.close()

def get_as_of_forecast(target_date: str, cutoff_iso: str, db_path: str = DEFAULT_DB_PATH) -> List[Dict[str, Any]]:
    """
    Fetches the actual generation and the latest forecast available as of cutoff_iso
    for all 48 settlement periods on target_date (YYYY-MM-DD).
    
    Handles resolution alignment: if WINDFOR is published hourly, half-hour intervals
    are forward-filled from the corresponding hour's latest forecast.
    """
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # 1. Fetch actuals for the settlement date
    cursor.execute("""
    SELECT settlement_date, settlement_period, start_time, generation AS actual_generation
    FROM actual_generation
    WHERE settlement_date = ?
    ORDER BY settlement_period ASC
    """, (target_date,))
    actual_rows = [dict(r) for r in cursor.fetchall()]

    if not actual_rows:
        conn.close()
        return []

    # 2. Fetch all candidate forecasts published on or before cutoff_iso for this date window
    start_of_day = f"{target_date}T00:00:00Z"
    end_of_day = f"{target_date}T23:59:59Z"

    cursor.execute("""
    WITH RankedForecasts AS (
        SELECT 
            start_time,
            publish_time,
            generation AS forecast_generation,
            ROW_NUMBER() OVER (
                PARTITION BY start_time 
                ORDER BY publish_time DESC
            ) as rn
        FROM forecast_generation
        WHERE publish_time <= ?
          AND start_time >= ?
          AND start_time <= ?
    )
    SELECT start_time, publish_time, forecast_generation
    FROM RankedForecasts
    WHERE rn = 1
    """, (cutoff_iso, start_of_day, end_of_day))

    forecast_map = {r["start_time"]: dict(r) for r in cursor.fetchall()}
    conn.close()

    # 3. Align actuals with forecasts (with fallback forward-fill for half-hours if needed)
    aligned_results = []
    last_known_forecast = None

    for act in actual_rows:
        st = act["start_time"]
        fc = forecast_map.get(st)
        
        # If no exact match (e.g. hourly forecast), check previous half-hour
        if not fc and st.endswith(":30:00Z"):
            base_hour_st = st.replace(":30:00Z", ":00:00Z")
            fc = forecast_map.get(base_hour_st)

        if fc:
            last_known_forecast = fc
            fc_val = fc["forecast_generation"]
            pub_time = fc["publish_time"]
        elif last_known_forecast:
            fc_val = last_known_forecast["forecast_generation"]
            pub_time = last_known_forecast["publish_time"]
        else:
            fc_val = None
            pub_time = None

        act_val = act["actual_generation"]
        delta = (fc_val - act_val) if (fc_val is not None and act_val is not None) else None

        aligned_results.append({
            "settlementDate": act["settlement_date"],
            "settlementPeriod": act["settlement_period"],
            "startTime": act["start_time"],
            "actualGeneration": act_val,
            "forecastGeneration": fc_val,
            "forecastPublishTime": pub_time,
            "errorDelta": delta, # Positive = Over-forecast (Deficit risk); Negative = Under-forecast (Surplus)
        })

    return aligned_results

def get_available_dates(db_path: str = DEFAULT_DB_PATH) -> List[str]:
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT settlement_date FROM actual_generation ORDER BY settlement_date ASC")
    dates = [row[0] for row in cursor.fetchall()]
    conn.close()
    return dates

def get_db_stats(db_path: str = DEFAULT_DB_PATH) -> Dict[str, Any]:
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM actual_generation")
    actual_count = cursor.fetchone()[0]
    cursor.execute("SELECT count(*) FROM forecast_generation")
    forecast_count = cursor.fetchone()[0]
    conn.close()
    return {
        "actualCount": actual_count,
        "forecastCount": forecast_count,
        "isSeeded": (actual_count > 0 and forecast_count > 0)
    }
