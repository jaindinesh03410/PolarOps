# Antarctic Station ML Microservice

Python + FastAPI service providing ML-powered predictions with explainability.

## Features

1. **A* Route Optimization** - Hazard-aware pathfinding
2. **NLP Emergency Triage** - Message classification
3. **Prophet Inventory Forecast** - Depletion prediction
4. **YOLOv8 Hazard Detection** - Computer vision for ice/crevasse detection
5. **Knapsack Cargo Optimization** - Load optimization

## Quick Start

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## API Documentation

Once running, visit: http://localhost:8001/docs

## Current Implementation

All models currently use **real implementations** that return actual ML-computed results with confidence scores and explanations.

### Mock vs Production-Ready

#### Production-Ready (Works Now)
- ✅ A* Route Optimization — real 8-connected grid pathfinding with haversine heuristic
- ✅ NLP Emergency Triage — TF-IDF + trained Naive Bayes classifier (persisted pickle)
- ✅ Prophet Inventory Forecast — real Facebook Prophet yhat/yhat_lower/yhat_upper
- ✅ Knapsack Cargo Optimization — real 2-constraint 0/1 DP
- ✅ **Weather data — real Open-Meteo live data, no API key needed, refreshed every 3h via cronService.js. Fused into A* router (weather_cells → high_cost), Prophet forecaster (severe_weather regressor), and correlation engine (WEATHER_INVENTORY + WEATHER_HAZARD rules).**

#### Placeholder / Swap-In Required
- 🟡 YOLOv8 hazard detection — pretrained COCO weights, not a custom crevasse model (loads real YOLO; taxonomy needs domain fine-tuning)

## Endpoints

- `POST /predict/route` - A* pathfinding
- `POST /predict/triage` - NLP emergency classification
- `POST /predict/forecast` - Inventory depletion forecast
- `POST /predict/hazard-detect` - YOLOv8 image analysis
- `POST /predict/optimize-cargo` - Knapsack optimization
- `GET /health` - Service health check
