# Deployment Guide - Antarctic Station Management System

## Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- Supabase project created

## Step-by-Step Deployment

### 1. Database Setup (Supabase)
```bash
# See supabase/README.md for detailed steps
1. Create Supabase project
2. Run all SQL migrations in order
3. Create auth users
4. Link users to personnel records
```

### 2. Backend API (Node.js)
```bash
cd backend-api
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run dev  # Development
# npm start  # Production
```

Runs on: http://localhost:3000

### 3. ML Service (Python)
```bash
cd backend-ml
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001  # Development
# uvicorn main:app --host 0.0.0.0 --port 8001  # Production
```

Runs on: http://localhost:8001

### 4. Frontend (React + Vite)
```bash
cd frontend
cp .env.example .env
# Edit .env with Supabase URL and anon key
npm install
npm run dev  # Development
# npm run build  # Production build
```

Runs on: http://localhost:5173

## Testing the 3 Signature Demos

### Demo 1: Offline Resilience
1. Login as Field Crew (ramesh.gupta@maitri.ant)
2. Open browser DevTools > Network tab
3. Set to "Offline" mode
4. Trigger SOS or submit wellness check-in
5. See "queued" message
6. Switch back to "Online"
7. Click sync button - data syncs immediately

### Demo 2: Unified Live Map
1. Login as Logistics Officer
2. Navigate to route planner
3. Compute a safe route - see hazards avoided
4. Map shows: hazards (red), computed route (blue), stations (green/red)
5. All updating in real-time

### Demo 3: Combined Risk Alert
1. Use seed data (Maitri station has declining wellness + low inventory)
2. Wait 30 mins for cron job OR manually run correlation:
   ```bash
   # In backend-api console:
   node -e "require('./src/services/correlationEngine.js').analyzeStationRisks('a0000000-0000-0000-0000-000000000001')"
   ```
3. Login as HQ Admin
4. See "Combined Risk Alert" in purple panel with explanation

## Production Deployment

### Option 1: Docker (Recommended)
```bash
# Create docker-compose.yml with:
# - backend-api service
# - backend-ml service  
# - nginx reverse proxy for frontend static files
docker-compose up -d
```

### Option 2: Individual Services
- **Frontend**: Deploy to Vercel/Netlify/Cloudflare Pages
- **Backend API**: Deploy to Railway/Render/Fly.io
- **ML Service**: Deploy to Railway/Render (Python support needed)
- **Database**: Already on Supabase

## Environment Variables Summary

### backend-api/.env
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ML_SERVICE_URL=http://localhost:8001
NODE_ENV=production
```

### frontend/.env
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3000/api
```

## Troubleshooting

**Auth errors**: Check user_id is set in personnel table
**RLS errors**: Verify policies in Supabase dashboard
**ML service down**: Frontend will still work, predictions will fail gracefully
**Offline sync not working**: Check IndexedDB in browser DevTools > Application
