#!/usr/bin/env python3
"""Quick ML service dependency check and test"""

import sys
print(f"✓ Python {sys.version}")

# Test imports
try:
    import fastapi
    print(f"✓ FastAPI {fastapi.__version__}")
except ImportError as e:
    print(f"✗ FastAPI not found: {e}")
    sys.exit(1)

try:
    import uvicorn
    print(f"✓ Uvicorn available")
except ImportError as e:
    print(f"✗ Uvicorn not found: {e}")
    sys.exit(1)

try:
    import numpy as np
    print(f"✓ NumPy {np.__version__}")
except ImportError as e:
    print(f"✗ NumPy not found: {e}")
    sys.exit(1)

try:
    import pandas as pd
    print(f"✓ Pandas {pd.__version__}")
except ImportError as e:
    print(f"✗ Pandas not found: {e}")
    sys.exit(1)

try:
    import sklearn
    print(f"✓ Scikit-learn {sklearn.__version__}")
except ImportError as e:
    print(f"✗ Scikit-learn not found: {e}")
    sys.exit(1)

try:
    import prophet
    print(f"✓ Prophet {prophet.__version__}")
except ImportError as e:
    print(f"⚠ Prophet not found (optional for forecast): {e}")

try:
    from ultralytics import YOLO
    print(f"✓ Ultralytics YOLO available")
except ImportError as e:
    print(f"⚠ YOLO not found (optional for detection): {e}")

print("\n🎯 Testing ML engines...")

# Test A*
try:
    sys.path.insert(0, 'backend-ml')
    from ml_models.astar import astar_pathfind
    result = astar_pathfind(
        {"lat": -70.0, "lng": 10.0},
        {"lat": -69.5, "lng": 11.0},
        []
    )
    print(f"✓ A* Pathfinding: {result['distance_km']}km route found")
except Exception as e:
    print(f"✗ A* failed: {e}")

# Test NLP
try:
    from ml_models.nlp_triage import get_classifier
    classifier = get_classifier()
    result = classifier.predict("Medical emergency, person collapsed")
    print(f"✓ NLP Triage: {result['predicted_category']}/{result['predicted_severity']}")
except Exception as e:
    print(f"✗ NLP failed: {e}")

# Test Knapsack
try:
    from ml_models.knapsack import knapsack_optimize
    result = knapsack_optimize(
        [{"item_name": "Test", "weight": 10, "volume": 5, "priority": 8}],
        20, 10
    )
    print(f"✓ Knapsack: {len(result['selected_items'])} items selected")
except Exception as e:
    print(f"✗ Knapsack failed: {e}")

# Test Forecast
try:
    from ml_models.inventory_forecast import forecast_depletion
    result = forecast_depletion(100, 5, "Test Item", [])
    print(f"✓ Prophet Forecast: {result['days_remaining']} days remaining")
except Exception as e:
    print(f"⚠ Forecast failed (Prophet may need installation): {e}")

print("\n✅ ML Service check complete!")
print("\nTo start ML service:")
print("  cd backend-ml")
print("  python main.py")
