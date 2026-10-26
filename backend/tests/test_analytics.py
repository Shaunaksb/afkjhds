import pytest
from analytics import compute_accuracy_metrics

def test_compute_accuracy_metrics_basic():
    # Synthetic test records
    # 4 settlement periods
    # Actual: [1000, 2000, 3000, 4000]
    # Forecast: [1100, 1900, 3200, 3800]
    # Errors: [+100, -100, +200, -200] -> Bias = 0.0
    # Abs Errors: [100, 100, 200, 200] -> MAE = 600 / 4 = 150.0
    # Sq Errors: [10000, 10000, 40000, 40000] -> RMSE = sqrt(100000 / 4) = sqrt(25000) = 158.11
    # Sum Actual = 10000 -> WAPE = (600 / 10000) * 100 = 6.0%
    sample = [
        {"settlementPeriod": 1, "startTime": "2026-01-01T00:00:00Z", "actualGeneration": 1000, "forecastGeneration": 1100},
        {"settlementPeriod": 2, "startTime": "2026-01-01T00:30:00Z", "actualGeneration": 2000, "forecastGeneration": 1900},
        {"settlementPeriod": 3, "startTime": "2026-01-01T01:00:00Z", "actualGeneration": 3000, "forecastGeneration": 3200},
        {"settlementPeriod": 4, "startTime": "2026-01-01T01:30:00Z", "actualGeneration": 4000, "forecastGeneration": 3800},
    ]

    metrics = compute_accuracy_metrics(sample)

    assert metrics["sampleCount"] == 4
    assert metrics["mae"] == 150.0
    assert metrics["rmse"] == 158.11
    assert metrics["bias"] == 0.0
    assert metrics["wape"] == 6.0
    assert metrics["overForecastCount"] == 2
    assert metrics["underForecastCount"] == 2
    assert metrics["riskLevel"] == "BALANCED"

def test_compute_accuracy_metrics_over_forecast_risk():
    # Systematic over-forecasting (Danger of real-time cash-out shortfall)
    sample = [
        {"settlementPeriod": 34, "startTime": "2026-01-01T17:00:00Z", "actualGeneration": 5000, "forecastGeneration": 6000},
        {"settlementPeriod": 35, "startTime": "2026-01-01T17:30:00Z", "actualGeneration": 5000, "forecastGeneration": 6200},
    ]
    metrics = compute_accuracy_metrics(sample)
    assert metrics["bias"] == 1100.0 # > 500 MW threshold
    assert metrics["riskLevel"] == "HIGH_DEFICIT_RISK"
    assert "eveningPeak" in metrics["peakAnalysis"]
    assert metrics["peakAnalysis"]["eveningPeak"]["count"] == 2

def test_compute_accuracy_metrics_empty():
    metrics = compute_accuracy_metrics([])
    assert metrics["sampleCount"] == 0
    assert metrics["mae"] == 0.0
