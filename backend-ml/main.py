from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import uvicorn
from datetime import datetime, timedelta
import math

# Import real ML models
from ml_models.astar import astar_pathfind, haversine_distance
from ml_models.nlp_triage import get_classifier
from ml_models.inventory_forecast import forecast_depletion
from ml_models.knapsack import knapsack_optimize

# Optional YOLO import
try:
    from ml_models.yolo_detect import detect_hazards_from_url
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("⚠️  YOLO detection unavailable (ultralytics not installed)")

app = FastAPI(title="Antarctic Station ML Service - Real Models")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# MODELS
# ============================================

class RouteRequest(BaseModel):
    start: Dict[str, float]  # {lat, lng}
    end: Dict[str, float]
    hazards: List[Dict[str, Any]] = []
    weather_cells: List[Dict[str, Any]] = []  # HIGH/CRITICAL Open-Meteo snapshots

class TriageRequest(BaseModel):
    message: str

class ForecastRequest(BaseModel):
    current_quantity: float
    daily_consumption: float
    item_name: str
    historical_data: List[Dict[str, Any]] = []
    weather_history: Optional[List[Dict[str, Any]]] = None  # {ds, severity_score} rows from weather_snapshots

class HazardDetectionRequest(BaseModel):
    image_url: str

class CargoOptimizationRequest(BaseModel):
    items: List[Dict[str, Any]]
    max_weight: float
    max_volume: float

# ============================================
# A* ROUTE OPTIMIZATION
# ============================================

@app.post("/predict/route")
async def predict_route(request: RouteRequest):
    """
    Real A* pathfinding algorithm with hazard avoidance
    Uses grid-based navigation with haversine heuristic
    """
    try:
        result = astar_pathfind(request.start, request.end, request.hazards, request.weather_cells)
        
        # Add explanation
        hazards_count = len(result['hazards_avoided'])
        weather_count = len(result.get('weather_avoided', []))

        if hazards_count > 0:
            hazard_types = ', '.join(set(h['type'] for h in result['hazards_avoided']))
            explanation = (
                f"A* algorithm computed safe route avoiding {hazards_count} hazard(s) "
                f"({hazard_types}). Explored {result['nodes_explored']} grid nodes. "
                f"Total distance: {result['distance_km']}km."
            )
        else:
            explanation = (
                f"A* algorithm found direct safe route. No hazards detected along path. "
                f"Explored {result['nodes_explored']} nodes. Distance: {result['distance_km']}km."
            )

        if weather_count > 0:
            weather_severities = ', '.join(
                set(w['severity'] for w in result['weather_avoided'])
            )
            conditions = ', '.join(
                set(w.get('condition', 'severe weather') for w in result['weather_avoided'] if w.get('condition'))
            ) or 'severe weather'
            explanation += (
                f" Route also re-routed around {weather_count} live weather corridor(s) "
                f"(severity: {weather_severities}; conditions: {conditions}) "
                f"sourced from real-time Open-Meteo data."
            )
        
        result['explanation'] = explanation
        return result
    
    except Exception as e:
        raise HTTPException(500, f"Route computation failed: {str(e)}")

# ============================================
# NLP EMERGENCY TRIAGE
# ============================================

@app.post("/predict/triage")
async def predict_triage(request: TriageRequest):
    """
    Real NLP-based emergency message classification
    Uses TF-IDF + trained Naive Bayes classifier
    """
    try:
        classifier = get_classifier()
        result = classifier.predict(request.message)
        return result
    except Exception as e:
        raise HTTPException(500, f"NLP classification failed: {str(e)}")

# ============================================
# PROPHET INVENTORY FORECAST
# ============================================

@app.post("/predict/forecast")
async def predict_forecast(request: ForecastRequest):
    """
    Real Facebook Prophet time-series forecasting
    Returns actual Prophet predictions with confidence intervals
    """
    try:
        if request.daily_consumption <= 0:
            raise HTTPException(400, "Daily consumption must be positive")
        
        result = forecast_depletion(
            request.current_quantity,
            request.daily_consumption,
            request.item_name,
            request.historical_data,
            request.weather_history,
        )
        return result
    except Exception as e:
        raise HTTPException(500, f"Forecast failed: {str(e)}")

# ============================================
# YOLOV8 HAZARD DETECTION
# ============================================

@app.post("/predict/hazard-detect")
async def detect_hazards(request: HazardDetectionRequest):
    """
    YOLOv8 inference on actual image pixels.
    PLACEHOLDER taxonomy: pretrained COCO weights, not a custom crevasse model.
    """
    if not YOLO_AVAILABLE:
        raise HTTPException(
            503,
            "YOLO detection service unavailable. Install 'pip install ultralytics' to enable."
        )
    try:
        return detect_hazards_from_url(request.image_url)
    except Exception as e:
        raise HTTPException(
            500,
            f"YOLOv8 inference failed (weights/image). No hash-based mock is used: {str(e)}",
        )

# ============================================
# KNAPSACK CARGO OPTIMIZATION
# ============================================

@app.post("/predict/optimize-cargo")
async def optimize_cargo(request: CargoOptimizationRequest):
    """
    Real 0/1 Knapsack Dynamic Programming Algorithm
    Guarantees optimal selection for weight + volume constraints
    """
    try:
        result = knapsack_optimize(
            request.items,
            request.max_weight,
            request.max_volume
        )
        return result
    except Exception as e:
        raise HTTPException(500, f"Cargo optimization failed: {str(e)}")

# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Antarctic Station ML Service",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "route_optimizer": "A* 8-connected grid + haversine heuristic ✓",
            "nlp_triage": "TF-IDF + MultinomialNB (fitted, persisted pickle) ✓",
            "inventory_forecast": "Facebook Prophet (yhat / yhat_lower / yhat_upper) ✓",
            "hazard_detection": "YOLOv8n pretrained COCO PLACEHOLDER" + (" ✓" if YOLO_AVAILABLE else " ✗ (not installed)"),
            "cargo_optimizer": "2-constraint 0/1 Knapsack DP ✓"
        },
        "yolo_available": YOLO_AVAILABLE
    }

# ============================================
# UTILITIES
# ============================================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km"""
    R = 6371  # Earth radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
