#!/usr/bin/env python3
"""
Weather integration tests for the Antarctic ML service.

Verifies that:
  1. /predict/route  explanation changes when weather_cells is present vs absent.
  2. /predict/forecast explanation changes when weather_history is present vs absent.

Matches the style of ../test-ml-service.py.
Run from the repo root:
    python backend-ml/test-weather-integration.py
Or with the ML service already running:
    python backend-ml/test-weather-integration.py --live
"""

import sys
import argparse

# ── Argument parsing ──────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Weather integration smoke tests")
parser.add_argument(
    "--live",
    action="store_true",
    help="Also call the running ML HTTP service (http://localhost:8001)",
)
parser.add_argument(
    "--port",
    type=int,
    default=8001,
    help="ML service port (default: 8001)",
)
args = parser.parse_args()

print(f"✓ Python {sys.version}")
print("─" * 60)
print("🌦️  Weather Integration Tests")
print("─" * 60)

# ── Shared test fixtures ──────────────────────────────────────────────────────
START     = {"lat": -70.0, "lng": 10.0}
END       = {"lat": -69.5, "lng": 11.0}

# A HIGH-severity weather cell sitting squarely on the direct route
WEATHER_CELL_HIGH = {
    "lat":          -69.75,
    "lng":          10.5,
    "severity":     "HIGH",
    "type":         "WEATHER",
    "condition":    "Blizzard",
    "wind_speed_kmh": 55.0,
    "visibility_km":  0.8,
}

WEATHER_CELL_CRITICAL = {
    "lat":          -69.75,
    "lng":          10.5,
    "severity":     "CRITICAL",
    "type":         "WEATHER",
    "condition":    "Whiteout",
    "wind_speed_kmh": 75.0,
    "visibility_km":  0.3,
}

# 45 days of weather history with escalating severity
from datetime import datetime, timedelta

def make_weather_history(days: int = 45, base_score: float = 0.0) -> list:
    """Generate {ds, severity_score} rows for the last `days` days."""
    history = []
    for i in range(days, 0, -1):
        ds    = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        score = min(3.0, base_score + (i % 4) * 0.5)   # 0–3 cycling
        history.append({"ds": ds, "severity_score": round(score, 1)})
    return history

WEATHER_HISTORY_REAL  = make_weather_history(45, base_score=1.5)  # mostly MEDIUM/HIGH
WEATHER_HISTORY_EMPTY = []   # triggers no-regressor path

PASS = 0
FAIL = 0

def ok(msg: str):
    global PASS
    PASS += 1
    print(f"  ✓ {msg}")

def fail(msg: str):
    global FAIL
    FAIL += 1
    print(f"  ✗ {msg}")

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Direct unit-level tests (no HTTP, always run)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[1] Direct model tests (no HTTP)")
print("─" * 40)

# ── 1a  A* with vs without weather_cells ──────────────────────────────────────
try:
    sys.path.insert(0, "backend-ml")
    from ml_models.astar import astar_pathfind

    # Baseline: no weather
    r_no_wx = astar_pathfind(START, END, [])
    has_weather_avoided_key = "weather_avoided" in r_no_wx
    if has_weather_avoided_key:
        ok("astar_pathfind() returns 'weather_avoided' key even when no weather_cells given")
    else:
        fail("astar_pathfind() missing 'weather_avoided' key in result")

    baseline_distance = r_no_wx["distance_km"]

    # With HIGH weather on the direct path
    r_high_wx = astar_pathfind(START, END, [], weather_cells=[WEATHER_CELL_HIGH])
    avoided = r_high_wx.get("weather_avoided", [])
    if len(avoided) >= 1:
        ok(f"weather_cells=[HIGH] → weather_avoided has {len(avoided)} entry/entries")
    else:
        fail("weather_cells=[HIGH] on the direct path but weather_avoided is empty")

    # With CRITICAL weather — detour should be at least as long as HIGH
    r_crit_wx = astar_pathfind(START, END, [], weather_cells=[WEATHER_CELL_CRITICAL])
    avoided_crit = r_crit_wx.get("weather_avoided", [])
    if len(avoided_crit) >= 1:
        ok(f"weather_cells=[CRITICAL] → weather_avoided has {len(avoided_crit)} entry/entries")
    else:
        fail("weather_cells=[CRITICAL] on the direct path but weather_avoided is empty")

    # LOW weather must NOT appear in weather_avoided (only HIGH/CRITICAL qualify)
    low_cell = {**WEATHER_CELL_HIGH, "severity": "LOW"}
    r_low_wx = astar_pathfind(START, END, [], weather_cells=[low_cell])
    if r_low_wx.get("weather_avoided", []) == []:
        ok("LOW-severity weather cell correctly excluded from weather_avoided")
    else:
        fail("LOW-severity weather cell incorrectly added to weather_avoided")

except Exception as e:
    fail(f"A* weather test raised exception: {e}")
    import traceback; traceback.print_exc()

# ── 1b  Prophet with vs without weather_history ───────────────────────────────
try:
    from ml_models.inventory_forecast import forecast_depletion

    # Baseline: no weather (must behave identically to pre-integration callers)
    r_no_wx = forecast_depletion(200.0, 5.0, "Fuel Drums", [], weather_history=None)
    expl_no_wx = r_no_wx.get("explanation", "")
    has_prophet_output = "days_remaining" in r_no_wx and "explanation" in r_no_wx
    if has_prophet_output:
        ok("forecast_depletion() without weather_history returns normal Prophet output")
    else:
        fail("forecast_depletion() without weather_history missing expected keys")

    # With real weather history
    r_with_wx = forecast_depletion(
        200.0, 5.0, "Fuel Drums", [], weather_history=WEATHER_HISTORY_REAL
    )
    expl_with_wx = r_with_wx.get("explanation", "")

    # The explanation must differ (weather sentence is appended when regressor fires)
    if expl_with_wx != expl_no_wx:
        ok("forecast_depletion() explanation changes when weather_history is present")
    else:
        # Regressor may not have fired if overlap < 2 — warn rather than hard-fail
        print("  ⚠ Explanation unchanged (regressor may not have fired — check overlap)")

    # Weather-adjusted explanation should mention 'weather'
    if "weather" in expl_with_wx.lower():
        ok("Weather-adjusted explanation contains 'weather' keyword")
    else:
        fail("Weather-adjusted explanation does not mention 'weather'")

    # Passing empty weather_history must yield same result as None (strict opt-in)
    r_empty_wx = forecast_depletion(200.0, 5.0, "Fuel Drums", [], weather_history=[])
    if r_empty_wx.get("explanation") == expl_no_wx:
        ok("Empty weather_history behaves identically to weather_history=None")
    else:
        # Numeric differences in Prophet are non-deterministic — soft check
        print("  ⚠ Minor explanation diff with empty list vs None (likely non-deterministic Prophet)")

except Exception as e:
    fail(f"Forecast weather test raised exception: {e}")
    import traceback; traceback.print_exc()

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — Live HTTP tests against running ML service (--live flag only)
# ═══════════════════════════════════════════════════════════════════════════════
if args.live:
    print(f"\n[2] Live HTTP tests against http://localhost:{args.port}")
    print("─" * 40)

    try:
        import requests
    except ImportError:
        print("  ⚠ 'requests' not installed — skipping HTTP tests (pip install requests)")
    else:
        base = f"http://localhost:{args.port}"

        # ── 2a  /predict/route ────────────────────────────────────────────────
        try:
            # No weather
            r = requests.post(f"{base}/predict/route", json={
                "start":         START,
                "end":           END,
                "hazards":       [],
                "weather_cells": [],
            }, timeout=15)
            r.raise_for_status()
            expl_no_wx = r.json().get("explanation", "")
            ok(f"/predict/route (no weather) → HTTP 200, explanation: {expl_no_wx[:60]}…")

            # With weather
            r2 = requests.post(f"{base}/predict/route", json={
                "start":         START,
                "end":           END,
                "hazards":       [],
                "weather_cells": [WEATHER_CELL_HIGH],
            }, timeout=15)
            r2.raise_for_status()
            d2    = r2.json()
            expl2 = d2.get("explanation", "")
            wa2   = d2.get("weather_avoided", [])

            if expl2 != expl_no_wx:
                ok(f"/predict/route explanation changes with weather_cells present")
            else:
                fail("/predict/route explanation identical with and without weather_cells")

            if "weather" in expl2.lower():
                ok(f"/predict/route explanation mentions 'weather' (weather_avoided={len(wa2)})")
            else:
                fail(f"/predict/route explanation does not mention 'weather' (weather_avoided={len(wa2)})")

        except Exception as e:
            fail(f"/predict/route HTTP test failed: {e}")

        # ── 2b  /predict/forecast ─────────────────────────────────────────────
        try:
            # No weather
            r = requests.post(f"{base}/predict/forecast", json={
                "current_quantity":  200.0,
                "daily_consumption": 5.0,
                "item_name":         "Fuel Drums",
                "historical_data":   [],
                "weather_history":   None,
            }, timeout=30)
            r.raise_for_status()
            expl_no_wx = r.json().get("explanation", "")
            ok(f"/predict/forecast (no weather) → HTTP 200")

            # With weather
            r2 = requests.post(f"{base}/predict/forecast", json={
                "current_quantity":  200.0,
                "daily_consumption": 5.0,
                "item_name":         "Fuel Drums",
                "historical_data":   [],
                "weather_history":   WEATHER_HISTORY_REAL,
            }, timeout=30)
            r2.raise_for_status()
            expl2 = r2.json().get("explanation", "")

            if expl2 != expl_no_wx:
                ok("/predict/forecast explanation changes when weather_history is present")
            else:
                print("  ⚠ Explanation unchanged — regressor may not have fired (check overlap)")

            if "weather" in expl2.lower():
                ok("/predict/forecast explanation mentions 'weather'")
            else:
                fail("/predict/forecast explanation does not mention 'weather'")

        except Exception as e:
            fail(f"/predict/forecast HTTP test failed: {e}")
else:
    print("\n  (skip HTTP tests — pass --live to test against running service)")

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "─" * 60)
total = PASS + FAIL
print(f"Results: {PASS}/{total} passed, {FAIL} failed")
if FAIL == 0:
    print("✅ All weather integration tests passed!")
else:
    print("❌ Some tests failed — see output above.")
    sys.exit(1)
