# Gridbricks | UK Day-Ahead Wind Generation & Wholesale Power Procurement Cockpit

An enterprise decision-support and quantitative error evaluation platform designed for energy utility power procurement desks operating in the **UK Day-Ahead Wholesale Electricity Market (EPEX SPOT / Nord Pool N2EX)**.

Built with **FastAPI (Python 3.15 + uv)**, **React 18 (TypeScript + Vite + Tailwind CSS + Recharts)**, and containerized via **Alpine Linux Docker**.

---

## 1. Executive Pitch to the Client (Energy Utility Trading Team)

### The Business Challenge
As an energy utility in Great Britain, you serve consumer electricity demand and must purchase power from the day-ahead wholesale market one day before delivery ($D-1$). To keep costs low and maximize sustainability, you want to consume as much renewable wind generation as possible, buying thermal power (gas/coal) only for the residual balance:

$$\text{Thermal Power to Procure (MW)} = \text{Consumer Demand (MW)} - \text{Expected Wind Generation (MW)}$$

However, wind is intermittent and weather-dependent. You must rely on national forecasts published before the market auction closes. 

### Why Naive Forecasting Destroys Trading Margins
1. **The Cost of Over-Forecasting (Deficit Risk):** If the forecast overestimates wind generation, you under-buy power in the day-ahead auction. In real-time delivery, when the wind falls short, you are caught short on the grid. The System Operator (National Grid ESO) penalizes you via the **System Buy Price (cash-out penalty)** in the Balancing Mechanism, which routinely spikes to **£500–£1,000+/MWh** during winter peaks.
2. **The Cost of Under-Forecasting (Surplus Risk):** If the forecast underestimates wind generation, you over-buy expensive thermal generation day-ahead, dumping excess power back into the system at depressed spill prices.

### What This Product Delivers
* **Zero-Leakage Point-in-Time Intelligence:** Select any delivery day in January 2026 and your exact decision cutoff time (default: 11:00 GMT on $D-1$). The platform queries only forecasts published *prior* to that moment, showing the exact state of knowledge your trading desk had at auction time.
* **Institutional Risk Quant Scorecard:** Evaluates MAE, RMSE, Mean Systemic Bias, and Volume-Weighted Percentage Error (WAPE), instantly alerting you whether the forecast poses a deficit risk or surplus risk.
* **Peak-Demand Stress Analysis:** Isolates morning (SP 15–18) and evening peak (SP 33–38) settlement periods where price volatility is 5x–10x higher.
* **Interactive Thermal Procurement Simulator:** Input your utility's peak customer demand in MW and confidence level (e.g., P90). The platform computes your exact 48-period thermal purchase order and recommends an empirical safety reserve buffer (e.g. +350 MW) to insulate your balance sheet against balancing penalties.

---

## 2. Technical Architecture & Design (For the Technical Lead)

```
                            [Elexon BMRS API]
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
        [FUELHH Stream]                          [WINDFOR Stream]
       (Actual Generation)                    (Forecast Revisions)
               │                                         │
               └────────────────────┬────────────────────┘
                                    ▼
                     [Ingestion & Parsing Worker]
                                    │
                                    ▼
                [SQLite Database (WAL Mode, Indexed)]
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
[Point-in-Time Query Engine]                     [Quantitative Analytics Engine]
  • publishTime <= cutoff                          • MAE, RMSE, WAPE, Bias
  • 30m / 60m resolution alignment                 • P10, P50, P90 Quantiles
  • Zero future lookahead bias                     • Peak Window Filtering
            │                                               │
            └───────────────────────┬───────────────────────┘
                                    ▼
                          [FastAPI REST API]
                     (Uvicorn ASGI Server :8000)
                                    │
                                    ▼
                      [React Trading UI (Vite)]
                  (Tailwind CSS + Recharts :3000)
```

### Key Technical Decisions

#### 1. Zero-Lookahead Point-in-Time Query Engine
A fundamental error in backtesting energy trading systems is lookahead bias (peeking at forecasts published after the auction gate closure). 
In `backend/db.py`, the query engine filters:
```sql
WITH RankedForecasts AS (
    SELECT start_time, publish_time, generation,
           ROW_NUMBER() OVER (PARTITION BY start_time ORDER BY publish_time DESC) as rn
    FROM forecast_generation
    WHERE publish_time <= :cutoff_iso
      AND start_time >= :start_of_day
      AND start_time <= :end_of_day
)
SELECT ... WHERE rn = 1
```
This guarantees that for a delivery day $D$ and decision cutoff $D-1$ at 11:00 GMT, no forecast published after 11:00 GMT can ever leak into the calculation.

#### 2. Resolution Mismatch Alignment (30-min vs 60-min)
Actual wind generation (`FUELHH`) is recorded at 30-minute settlement period resolution (48 per day). Forecasts (`WINDFOR`) are often generated by National Grid ESO in 60-minute intervals. The backend dynamically aligns timestamps, forward-filling hourly forecast horizons into corresponding `:30` half-hour slots so comparisons are mathematically uniform across all 48 settlement periods.

#### 3. WAPE vs. MAPE under Near-Zero Wind
Standard Mean Absolute Percentage Error (MAPE) divides by $Actual_i$. On low-wind winter days where actual generation drops below 50 MW, standard MAPE mathematically explodes to $>500\%$. The analytics engine implements **Weighted Absolute Percentage Error (WAPE)**:
$$\text{WAPE} = \frac{\sum |Actual_i - Forecast_i|}{\sum Actual_i} \times 100\%$$
This weights percentage error by generation volume, giving traders an economically grounded metric.

#### 4. Pre-Seeded Zero-Latency Local Storage
To prevent client latency and avoid Elexon BMRS API rate-limiting during demos and tests, the full January 2026 dataset (1,489 actual generation records and 19,272 forecast records) is pre-seeded in a bundled SQLite database (`backend/data/wind_data_jan2026.db`) running with Write-Ahead Logging (`PRAGMA journal_mode=WAL`).

---

## 3. Quickstart & Local Setup

### Option A: One-Command Boot via Docker Compose (Recommended)
Prerequisites: Docker & Docker Compose.

```bash
# Clone and enter directory
cd E:\Shaunak\ECode\Assignments\Gridbricks

# Launch both frontend and backend
docker compose up --build
```
* **Frontend Web App:** Open `http://localhost:3000`
* **FastAPI Interactive API Docs:** Open `http://localhost:8000/docs`

---

### Option B: Local Development (Without Docker)

#### 1. Backend Setup (Python 3.15 + uv)
```bash
cd backend

# Create virtual environment and install dependencies via uv
uv venv --python 3.15
uv pip install -r pyproject.toml

# (Optional) Verify pre-seeded database or fetch fresh data
.venv/Scripts/python ingest_seed.py 31

# Run unit and integration tests (9 passing tests)
.venv/Scripts/pytest -v

# Start FastAPI development server on port 8000
.venv/Scripts/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup (React + Vite)
```bash
cd frontend

# Install node dependencies
npm install

# Run frontend in development mode on port 3000
npm run dev

# Or build for production
npm run build
```

---

## 5. API Reference Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Service status, Elexon database statistics, and date coverage. |
| `/api/dates` | `GET` | List all available January 2026 settlement dates in the database. |
| `/api/forecast/day-ahead` | `GET` | Fetches aligned 48-period actuals vs. as-of forecast curve and quant metrics for a target date and cutoff. |
| `/api/metrics/monthly` | `GET` | Computes monthly aggregate MAE, RMSE, Bias, WAPE, and daily risk rankings. |
| `/api/procurement/simulate`| `POST` | Simulates net thermal purchase orders and safety buffers given utility demand parameters. |
| `/api/sync` | `POST` | Triggers background sync to pull fresh data from Elexon BMRS streams. |

Interactive Swagger documentation is available at `/docs`.

---

## 6. Disclosure of AI Tools Used

In accordance with the Gridbricks hiring challenge instructions, the following AI tools assisted during the development of this platform:
* **Google DeepMind Antigravity CLI (Gemini 3.8 Flash):** Used as an interactive pair programmer for system architecture design, Elexon BMRS stream schema inspection, fast scaffolding of TypeScript components, mathematical metric verification (WAPE, RMSE, Bias), and Docker multi-stage configuration.
* All generated code, database queries, and quantitative logic were verified through automated unit tests (`pytest`), TypeScript compilation (`tsc`), and end-to-end integration tests.
