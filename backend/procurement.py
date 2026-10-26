from typing import List, Dict, Any, Optional

def simulate_thermal_procurement(
    settlement_records: List[Dict[str, Any]],
    base_demand_mw: float = 15000.0,
    demand_profile_type: str = "winter_typical",
    confidence_level: float = 0.90
) -> Dict[str, Any]:
    """
    Simulates day-ahead wholesale thermal procurement decisions across 48 settlement periods.
    Calculates net market power required beyond wind forecast, and models the safety reserve buffer.
    """
    # Typical UK winter relative demand profile per settlement period (normalized around 1.0)
    # Morning peak around SP 16 (08:00), evening peak around SP 35 (17:30)
    def get_demand_multiplier(sp: int) -> float:
        if 1 <= sp <= 12: # 00:00 - 06:00 (Night Valley)
            return 0.72 + (sp / 12) * 0.10
        elif 13 <= sp <= 20: # 06:00 - 10:00 (Morning Ramp & Peak)
            return 0.85 + (0.30 if 15 <= sp <= 18 else 0.15)
        elif 21 <= sp <= 32: # 10:00 - 16:00 (Mid-day Plateau)
            return 0.95
        elif 33 <= sp <= 40: # 16:30 - 20:00 (Evening Peak)
            return 1.15 + (0.15 if 34 <= sp <= 38 else 0.05)
        else: # 20:00 - 24:00 (Evening Wind-down)
            return 0.90 - ((sp - 40) / 8) * 0.15

    schedule = []
    total_demand_mwh = 0.0
    total_wind_forecast_mwh = 0.0
    total_actual_wind_mwh = 0.0
    total_thermal_procured_mwh = 0.0
    total_uncovered_deficit_mwh = 0.0

    # Calculate historical errors to determine safety buffer
    over_forecast_errors = [
        r["errorDelta"] for r in settlement_records 
        if r.get("errorDelta") is not None and r["errorDelta"] > 0
    ]
    if over_forecast_errors:
        over_forecast_errors.sort()
        idx = int(confidence_level * (len(over_forecast_errors) - 1))
        safety_buffer_mw = max(100.0, over_forecast_errors[idx])
    else:
        safety_buffer_mw = 350.0 # Conservative baseline default (350 MW)

    for r in settlement_records:
        sp = r["settlementPeriod"]
        multiplier = get_demand_multiplier(sp) if demand_profile_type == "winter_typical" else 1.0
        demand = base_demand_mw * multiplier
        
        fc_wind = r.get("forecastGeneration") or 0.0
        act_wind = r.get("actualGeneration") or 0.0

        # Base procurement without buffer
        base_thermal = max(0.0, demand - fc_wind)

        # Procurement with recommended risk buffer
        buffered_thermal = max(0.0, demand - max(0.0, fc_wind - safety_buffer_mw))

        # Real-time actual net position if trader bought base_thermal
        # Net actual = (base_thermal + act_wind) - demand
        net_actual_balance = (base_thermal + act_wind) - demand
        deficit_mw = abs(net_actual_balance) if net_actual_balance < 0 else 0.0

        # Convert 30-min MW to MWh (0.5 hour duration)
        total_demand_mwh += demand * 0.5
        total_wind_forecast_mwh += fc_wind * 0.5
        total_actual_wind_mwh += act_wind * 0.5
        total_thermal_procured_mwh += base_thermal * 0.5
        total_uncovered_deficit_mwh += deficit_mw * 0.5

        schedule.append({
            "settlementPeriod": sp,
            "startTime": r["startTime"],
            "demandMW": round(demand, 1),
            "windForecastMW": round(fc_wind, 1),
            "actualWindMW": round(act_wind, 1),
            "baseThermalOrderMW": round(base_thermal, 1),
            "recommendedBufferedOrderMW": round(buffered_thermal, 1),
            "imbalanceDeficitMW": round(deficit_mw, 1)
        })

    return {
        "baseDemandMW": base_demand_mw,
        "demandProfile": demand_profile_type,
        "safetyBufferMW": round(safety_buffer_mw, 1),
        "confidenceLevelPct": int(confidence_level * 100),
        "totalDemandMWh": round(total_demand_mwh, 1),
        "totalWindForecastMWh": round(total_wind_forecast_mwh, 1),
        "totalActualWindMWh": round(total_actual_wind_mwh, 1),
        "totalThermalProcuredMWh": round(total_thermal_procured_mwh, 1),
        "totalUncoveredDeficitMWh": round(total_uncovered_deficit_mwh, 1),
        "schedule": schedule
    }
