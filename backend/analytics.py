import math
from typing import List, Dict, Any, Optional

def compute_accuracy_metrics(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes rigorous energy trading quantitative accuracy metrics for a set of
    settlement periods containing both actualGeneration and forecastGeneration.
    """
    valid_pairs = []
    for r in records:
        act = r.get("actualGeneration")
        fc = r.get("forecastGeneration")
        if act is not None and fc is not None:
            valid_pairs.append({
                "settlementPeriod": r.get("settlementPeriod"),
                "startTime": r.get("startTime"),
                "actual": float(act),
                "forecast": float(fc),
                "error": float(fc) - float(act), # positive = over-forecast, negative = under-forecast
                "abs_error": abs(float(fc) - float(act))
            })

    n = len(valid_pairs)
    if n == 0:
        return {
            "sampleCount": 0,
            "mae": 0.0,
            "rmse": 0.0,
            "bias": 0.0,
            "wape": 0.0,
            "mape": 0.0,
            "maxOverForecast": 0.0,
            "maxUnderForecast": 0.0,
            "overForecastCount": 0,
            "underForecastCount": 0,
            "riskLevel": "UNKNOWN",
            "percentiles": {"p10": 0.0, "p50": 0.0, "p90": 0.0},
            "peakAnalysis": {}
        }

    sum_abs_err = sum(p["abs_error"] for p in valid_pairs)
    sum_sq_err = sum(p["error"] ** 2 for p in valid_pairs)
    sum_err = sum(p["error"] for p in valid_pairs)
    sum_actual = sum(p["actual"] for p in valid_pairs)

    mae = sum_abs_err / n
    rmse = math.sqrt(sum_sq_err / n)
    bias = sum_err / n
    
    # Weighted Absolute Percentage Error (WAPE) - resilient to near-zero wind
    wape = (sum_abs_err / sum_actual * 100.0) if sum_actual > 0 else 0.0

    # Guarded MAPE (ignoring actuals < 100 MW to prevent infinite skew)
    mape_eligible = [p for p in valid_pairs if p["actual"] >= 100.0]
    if mape_eligible:
        mape = (sum(p["abs_error"] / p["actual"] for p in mape_eligible) / len(mape_eligible)) * 100.0
    else:
        mape = wape

    errors_sorted = sorted(p["error"] for p in valid_pairs)
    p10 = errors_sorted[int(0.10 * (n - 1))]
    p50 = errors_sorted[int(0.50 * (n - 1))]
    p90 = errors_sorted[int(0.90 * (n - 1))]

    over_forecasts = [p for p in valid_pairs if p["error"] > 0]
    under_forecasts = [p for p in valid_pairs if p["error"] < 0]

    max_over = max((p["error"] for p in over_forecasts), default=0.0)
    max_under = abs(min((p["error"] for p in under_forecasts), default=0.0))

    # Peak hour analysis
    morning_peak = [p for p in valid_pairs if 15 <= p["settlementPeriod"] <= 18] # 07:00 - 09:00
    evening_peak = [p for p in valid_pairs if 33 <= p["settlementPeriod"] <= 38] # 16:30 - 19:30
    off_peak = [p for p in valid_pairs if not (15 <= p["settlementPeriod"] <= 18 or 33 <= p["settlementPeriod"] <= 38)]

    def calc_period_metric(subset: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not subset:
            return {"count": 0, "mae": 0.0, "bias": 0.0}
        sub_mae = sum(p["abs_error"] for p in subset) / len(subset)
        sub_bias = sum(p["error"] for p in subset) / len(subset)
        return {
            "count": len(subset),
            "mae": round(sub_mae, 2),
            "bias": round(sub_bias, 2)
        }

    # Trading desk risk classification
    if bias > 500:
        risk_level = "HIGH_DEFICIT_RISK" # High over-forecasting -> will be short power in real-time
        risk_label = "High Short Imbalance Risk (Over-forecasting)"
    elif bias < -500:
        risk_level = "SURPLUS_RISK" # High under-forecasting -> excess power procured
        risk_label = "Surplus Procurement Risk (Under-forecasting)"
    else:
        risk_level = "BALANCED"
        risk_label = "Balanced / Low Systemic Bias"

    return {
        "sampleCount": n,
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "bias": round(bias, 2),
        "wape": round(wape, 2),
        "mape": round(mape, 2),
        "maxOverForecast": round(max_over, 2),
        "maxUnderForecast": round(max_under, 2),
        "overForecastCount": len(over_forecasts),
        "underForecastCount": len(under_forecasts),
        "riskLevel": risk_level,
        "riskLabel": risk_label,
        "percentiles": {
            "p10": round(p10, 2),
            "p50": round(p50, 2),
            "p90": round(p90, 2)
        },
        "peakAnalysis": {
            "morningPeak": calc_period_metric(morning_peak),
            "eveningPeak": calc_period_metric(evening_peak),
            "offPeak": calc_period_metric(off_peak)
        }
    }
