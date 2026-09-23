# Antarctic Research Station Management System
## SIH 2024 - Problem Statement 26062

Production-grade system for managing remote polar stations during winter isolation with full offline capability, explainable AI, and comprehensive audit trails.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend API**: Node.js + Express
- **ML Service**: Python + FastAPI
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Maps**: Leaflet.js

## Project Structure
```
/frontend          - React PWA application
/backend-api       - Node.js REST API
/backend-ml        - Python ML microservice
/supabase          - Database migrations & policies
```

## Quick Start

### 1. Supabase Setup
1. Create a new Supabase project at https://supabase.com
2. Copy `.env.example` to `.env` in each directory
3. Run migrations: `cd supabase && npm run migrate`

### 2. Backend API
```bash
cd backend-api
npm install
npm run dev
```

### 3. ML Service
```bash
cd backend-ml
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Key Features
- ✅ 5 Role-based dashboards (HQ Admin, Commander, Logistics, Medical, Field Crew)
- ✅ Offline-first PWA with delta sync
- ✅ Explainable AI with confidence scoring
- ✅ Real-time audit logging
- ✅ Data provenance tracking ([MEASURED]/[SIMULATED])
- ✅ Cross-dashboard risk correlation
- ✅ Antarctic Treaty compliance scanning

## Signature Demo Moments
1. **Offline Resilience**: Field PWA works with zero connectivity, syncs on reconnect
2. **Unified Live Map**: Real-time hazards + routes + SOS on single map
3. **Combined Risk Alerts**: Auto-correlation of wellness + inventory + hazard signals
