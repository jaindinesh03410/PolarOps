# 🎯 DEMO MODE - Auth Bypass Enabled

## Quick Access (No Supabase Setup Needed!)

The system is now in **DEMO MODE** - you can access the frontend without Supabase setup.

### How to Use:

1. **Start Frontend Only:**
   ```powershell
   cd frontend
   npm run dev
   ```

2. **Open Browser:**
   - Go to: http://localhost:5173
   - Click "Sign In" button (any email/password works)
   - You'll see **Field Crew Dashboard** automatically

### Demo Features Working:
- ✅ Full UI and navigation
- ✅ Layout and design system
- ✅ Offline mode indicators
- ✅ Dashboard components
- ✅ Form interactions (wellness check-in, SOS)

### Demo Limitations:
- ❌ No real data from database
- ❌ API calls will fail (need backend)
- ❌ Can't save data

---

## To Access Different Dashboards:

Manually navigate to URLs:

- **HQ Admin:** http://localhost:5173/hq-admin
- **Station Commander:** http://localhost:5173/commander
- **Logistics Officer:** http://localhost:5173/logistics
- **Medical Officer:** http://localhost:5173/medical
- **Field Crew:** http://localhost:5173/field

---

## To Enable Full System:

1. **Setup Supabase** (see WINDOWS_QUICKSTART.md)
2. **Start Backend API:**
   ```powershell
   cd backend-api
   npm run dev
   ```
3. **Start ML Service:**
   ```powershell
   cd backend-ml
   .\venv\Scripts\Activate.ps1
   uvicorn main:app --reload --port 8001
   ```
4. **Disable Demo Mode:**
   In `frontend/src/contexts/AuthContext.jsx`, change:
   ```javascript
   const demoMode = true; // Change to false
   ```

---

## Current Demo User:
- Name: Demo User
- Role: Field Crew
- Station: Maitri Station

You can change the role in `AuthContext.jsx` to see different dashboards:
- `'HQ_ADMIN'`
- `'STATION_COMMANDER'`
- `'LOGISTICS_OFFICER'`
- `'MEDICAL_OFFICER'`
- `'FIELD_CREW'`
