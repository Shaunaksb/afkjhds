import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from db import init_db, get_as_of_forecast, get_available_dates, get_db_stats
from analytics import compute_accuracy_metrics
from procurement import simulate_thermal_procurement
from elexon_service import sync_elexon_range

# Initialize DB on boot
init_db()

app = FastAPI(
    title="Gridbricks UK Day-Ahead Wind Forecast & Procurement Platform",
    description="Operational decision-support and quantitative error evaluation API for UK energy trading desks using Elexon BMRS streams.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProcurementRequest(BaseModel):
    date: str = Field(..., description="Target delivery date (YYYY-MM-DD)")
    cutoff: str = Field("11:00", description="D-1 Gate closure cutoff time (HH:MM in GMT)")
    baseDemandMW: float = Field(15000.0, description="Base utility consumer demand in MW")
    demandProfile: str = Field("winter_typical", description="Demand profile shape ('winter_typical' or 'flat')")
    confidenceLevel: float = Field(0.90, description="Confidence interval for safety buffer (0.50 to 0.99)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "date": "2026-01-15",
                    "cutoff": "11:00",
                    "baseDemandMW": 15000.0,
                    "demandProfile": "winter_typical",
                    "confidenceLevel": 0.90
                }
            ]
        }
    }

@app.get("/api/health")
def get_health():
    stats = get_db_stats()
    dates = get_available_dates()
    return {
        "status": "online",
        "service": "gridbricks-wind-backend",
        "market": "UK Day-Ahead Wholesale (EPEX / N2EX)",
        "database": stats,
        "availableDatesCount": len(dates),
        "minDate": dates[0] if dates else None,
        "maxDate": dates[-1] if dates else None
    }

@app.get("/api/dates")
def list_dates():
    dates = get_available_dates()
    return {"dates": dates}

def parse_cutoff_iso(target_date: str, cutoff_hh_mm: str) -> str:
    """
    Computes the exact ISO 8601 cutoff timestamp on D-1.
    e.g. For delivery date 2026-01-15 and cutoff '11:00',
    the cutoff timestamp is 2026-01-14T11:00:00Z.
    """
    try:
        t_date = datetime.strptime(target_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        d_minus_one = t_date - timedelta(days=1)
        
        parts = cutoff_hh_mm.strip().split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0

        cutoff_dt = d_minus_one.replace(hour=hour, minute=minute, second=0, microsecond=0)
        return cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid date or cutoff time format: {e}")

@app.get("/api/forecast/day-ahead")
def get_day_ahead_forecast(
    date: str = Query(..., description="Target delivery date (YYYY-MM-DD)"),
    cutoff: str = Query("11:00", description="D-1 Gate closure cutoff time (HH:MM GMT)")
):
    """
    Returns the point-in-time day-ahead wind forecast available at D-1 gate closure
    aligned with actual generation for all 48 settlement periods.
    """
    cutoff_iso = parse_cutoff_iso(date, cutoff)
    periods = get_as_of_forecast(date, cutoff_iso)

    if not periods:
        raise HTTPException(
            status_code=404, 
            detail=f"No generation data available for date '{date}'. Please ensure data is seeded."
        )

    metrics = compute_accuracy_metrics(periods)

    return {
        "deliveryDate": date,
        "marketCutoffTime": cutoff,
        "cutoffISO": cutoff_iso,
        "settlementPeriods": periods,
        "metrics": metrics
    }

@app.get("/api/metrics/monthly")
def get_monthly_metrics(
    month: str = Query("2026-01", description="Target month in YYYY-MM format"),
    cutoff: str = Query("11:00", description="D-1 Gate closure cutoff time (HH:MM GMT)")
):
    """
    Calculates monthly aggregate forecast accuracy metrics across all days in the target month.
    """
    all_dates = [d for d in get_available_dates() if d.startswith(month)]
    
    if not all_dates:
        raise HTTPException(status_code=404, detail=f"No data available for month '{month}'.")

    all_periods = []
    daily_breakdown = []

    for d in all_dates:
        cutoff_iso = parse_cutoff_iso(d, cutoff)
        day_periods = get_as_of_forecast(d, cutoff_iso)
        if day_periods:
            all_periods.extend(day_periods)
            day_metrics = compute_accuracy_metrics(day_periods)
            daily_breakdown.append({
                "date": d,
                "sampleCount": day_metrics["sampleCount"],
                "mae": day_metrics["mae"],
                "rmse": day_metrics["rmse"],
                "bias": day_metrics["bias"],
                "wape": day_metrics["wape"],
                "riskLevel": day_metrics["riskLevel"]
            })

    monthly_summary = compute_accuracy_metrics(all_periods)

    return {
        "month": month,
        "cutoffTime": cutoff,
        "daysCount": len(daily_breakdown),
        "totalSettlementPeriods": len(all_periods),
        "summary": monthly_summary,
        "dailyBreakdown": daily_breakdown
    }

@app.post("/api/procurement/simulate")
def simulate_procurement(req: ProcurementRequest):
    """
    Calculates thermal power procurement requirements and recommended reserve safety buffers.
    """
    cutoff_iso = parse_cutoff_iso(req.date, req.cutoff)
    periods = get_as_of_forecast(req.date, cutoff_iso)

    if not periods:
        raise HTTPException(
            status_code=404,
            detail=f"No generation data available for date '{req.date}'."
        )

    result = simulate_thermal_procurement(
        settlement_records=periods,
        base_demand_mw=req.baseDemandMW,
        demand_profile_type=req.demandProfile,
        confidence_level=req.confidenceLevel
    )

    return {
        "deliveryDate": req.date,
        "marketCutoffTime": req.cutoff,
        "cutoffISO": cutoff_iso,
        "simulation": result
    }

@app.post("/api/sync")
def trigger_sync(background_tasks: BackgroundTasks, days: int = Query(31, ge=1, le=31)):
    """
    Trigger on-demand background sync from Elexon BMRS API.
    """
    def do_sync():
        sync_elexon_range("2026-01-01", "2026-01-31")

    background_tasks.add_task(do_sync)
    return {"status": "sync_initiated", "message": f"Syncing {days} days of Jan 2026 Elexon data in background"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
