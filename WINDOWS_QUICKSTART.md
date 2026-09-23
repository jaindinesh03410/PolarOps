# Windows Quick Start Guide

## Prerequisites
- Node.js 18+ ([Download](https://nodejs.org))
- Python 3.10+ ([Download](https://python.org))
- Git (optional)

## Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** in the dashboard
4. Run these SQL files **in order**:
   - Copy/paste content from `supabase/schema.sql` → Run
   - Copy/paste content from `supabase/audit-triggers.sql` → Run
   - Copy/paste content from `supabase/rls-policies.sql` → Run
   - Copy/paste content from `supabase/seed-data.sql` → Run

5. Go to **Authentication** → **Users** → **Add user**
   Create these test users with any password:
   - `rajesh.kumar@ncaor.gov.in` (HQ Admin)
   - `anil.sharma@maitri.ant` (Station Commander)
   - `vikram.patel@maitri.ant` (Logistics Officer)
   - `priya.singh@maitri.ant` (Medical Officer)
   - `ramesh.gupta@maitri.ant` (Field Crew)

6. After creating users, go back to **SQL Editor** and run:
   ```sql
   -- Update personnel records with auth user IDs
   UPDATE personnel SET user_id = (SELECT id FROM auth.users WHERE email = 'rajesh.kumar@ncaor.gov.in') WHERE email = 'rajesh.kumar@ncaor.gov.in';
   UPDATE personnel SET user_id = (SELECT id FROM auth.users WHERE email = 'anil.sharma@maitri.ant') WHERE email = 'anil.sharma@maitri.ant';
   UPDATE personnel SET user_id = (SELECT id FROM auth.users WHERE email = 'vikram.patel@maitri.ant') WHERE email = 'vikram.patel@maitri.ant';
   UPDATE personnel SET user_id = (SELECT id FROM auth.users WHERE email = 'priya.singh@maitri.ant') WHERE email = 'priya.singh@maitri.ant';
   UPDATE personnel SET user_id = (SELECT id FROM auth.users WHERE email = 'ramesh.gupta@maitri.ant') WHERE email = 'ramesh.gupta@maitri.ant';
   ```

7. Get your project credentials:
   - Go to **Settings** → **API**
   - Copy **Project URL** and **anon/public key**

## Step 2: Configure Environment Files

### Backend API Configuration
1. Copy `backend-api/.env.example` to `backend-api/.env`
2. Edit `backend-api/.env`:
   ```
   SUPABASE_URL=<your-project-url>
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_KEY=<your-service-role-key>
   ML_SERVICE_URL=http://localhost:8001
   NODE_ENV=development
   ```

### Frontend Configuration
1. Copy `frontend/.env.example` to `frontend/.env`
2. Edit `frontend/.env`:
   ```
   VITE_SUPABASE_URL=<your-project-url>
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   VITE_API_URL=http://localhost:3000/api
   ```

## Step 3: Install Dependencies

Open PowerShell in the project root and run:

```powershell
.\setup-windows.ps1
```

This will:
- Check Node.js and Python installations
- Install backend-api dependencies
- Create Python virtual environment for ML service
- Install frontend dependencies

## Step 4: Start All Services

```powershell
.\start-windows.ps1
```

This opens **3 separate PowerShell windows**:
- 🔵 Backend API (Port 3000)
- 🟣 ML Service (Port 8001)
- 🟢 Frontend (Port 5173)

## Step 5: Access the Application

Open your browser to: **http://localhost:5173**

Login with any of the demo accounts you created (use the password you set).

## Manual Start (Alternative)

If you prefer to start services manually:

### Terminal 1 - Backend API
```powershell
cd backend-api
npm run dev
```

### Terminal 2 - ML Service
```powershell
cd backend-ml
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8001
```

### Terminal 3 - Frontend
```powershell
cd frontend
npm run dev
```

## Testing the 3 Signature Demos

### Demo 1: Offline Resilience
1. Login as Field Crew (`ramesh.gupta@maitri.ant`)
2. Press F12 → Network tab → Set to "Offline"
3. Click "SEND SOS" - see "queued" message
4. Go back "Online" → Click sync button
5. Watch data sync immediately

### Demo 2: Unified Live Map
1. Login as Logistics Officer (`vikram.patel@maitri.ant`)
2. See map with hazards (red), routes (blue), stations (markers)
3. Click "Compute Safe Route"
4. See route avoid hazards with explanation

### Demo 3: Combined Risk Alert
1. Login as HQ Admin (`rajesh.kumar@ncaor.gov.in`)
2. Wait 30 minutes OR manually trigger:
   ```powershell
   cd backend-api
   node -e "require('./src/services/correlationEngine.js').analyzeStationRisks('a0000000-0000-0000-0000-000000000001').then(r => console.log(r))"
   ```
3. See purple "Combined Risk Alert" panel
4. View contributing factors from multiple modules

## Troubleshooting

### "npm: command not found"
- Install Node.js from [nodejs.org](https://nodejs.org)
- Restart PowerShell after installation

### "python: command not found"
- Install Python from [python.org](https://python.org)
- Check "Add Python to PATH" during installation
- Restart PowerShell

### Backend API errors
- Verify `.env` file exists in `backend-api/`
- Check Supabase credentials are correct
- Ensure port 3000 is not in use

### ML Service won't start
- Check virtual environment: `Test-Path backend-ml/venv`
- Rerun: `cd backend-ml; python -m venv venv`
- Activate and install: `.\venv\Scripts\Activate.ps1; pip install -r requirements.txt`

### Frontend can't connect
- Verify `.env` file exists in `frontend/`
- Check Backend API is running on port 3000
- Clear browser cache

### Auth errors after login
- Verify you ran the UPDATE queries to link auth users to personnel
- Check user emails match exactly (case-sensitive)
- Try logging out and back in

## Stopping Services

Press **Ctrl+C** in each PowerShell window to stop the services.

## Next Steps

See **DEPLOYMENT.md** for production deployment guide.
See **PROJECT_SUMMARY.md** for complete feature list.
