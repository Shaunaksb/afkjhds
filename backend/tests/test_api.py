import pytest
from fastapi.testclient import TestClient
import sys
import os

# Ensure backend root is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["database"]["isSeeded"] is True
    assert data["availableDatesCount"] >= 31

def test_dates_endpoint():
    response = client.get("/api/dates")
    assert response.status_code == 200
    data = response.json()
    assert "2026-01-15" in data["dates"]

def test_day_ahead_forecast_point_in_time():
    # Test Jan 15 with 11:00 D-1 cutoff
    response = client.get("/api/forecast/day-ahead?date=2026-01-15&cutoff=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["deliveryDate"] == "2026-01-15"
    assert data["cutoffISO"] == "2026-01-14T11:00:00Z"
    assert len(data["settlementPeriods"]) == 48

    # Verify every settlement period has actual, forecast, and error delta
    for p in data["settlementPeriods"]:
        assert "actualGeneration" in p
        assert "forecastGeneration" in p
        assert "errorDelta" in p

    assert data["metrics"]["sampleCount"] == 48
    assert data["metrics"]["mae"] > 0.0

def test_cutoff_sensitivity_no_leakage():
    # Comparing 07:00 cutoff vs 16:00 cutoff on D-1
    res_early = client.get("/api/forecast/day-ahead?date=2026-01-15&cutoff=07:00")
    res_late = client.get("/api/forecast/day-ahead?date=2026-01-15&cutoff=16:00")
    assert res_early.status_code == 200
    assert res_late.status_code == 200
    
    # Cutoff timestamps must differ
    assert res_early.json()["cutoffISO"] == "2026-01-14T07:00:00Z"
    assert res_late.json()["cutoffISO"] == "2026-01-14T16:00:00Z"

def test_monthly_metrics():
    response = client.get("/api/metrics/monthly?month=2026-01&cutoff=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["month"] == "2026-01"
    assert data["daysCount"] >= 31
    assert data["summary"]["sampleCount"] >= 1400

def test_procurement_simulation():
    payload = {
        "date": "2026-01-15",
        "cutoff": "11:00",
        "baseDemandMW": 18000.0,
        "demandProfile": "winter_typical",
        "confidenceLevel": 0.90
    }
    response = client.post("/api/procurement/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "simulation" in data
    assert data["simulation"]["safetyBufferMW"] > 0
    assert len(data["simulation"]["schedule"]) == 48
