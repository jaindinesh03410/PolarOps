# ✅ WORKING DEMO GUIDE - Step by Step

## 🚀 Complete Working Features List

### ✓ Features That Work (100% Functional)

1. **Login System** - Demo mode with 5 roles
2. **Station Commander Dashboard** - All features work
3. **Logistics Officer Dashboard** - Route computation, cargo optimization
4. **Field Crew Dashboard** - SOS, wellness tracking, offline mode
5. **HQ Admin Dashboard** - Live map, alerts, audit logs
6. **Medical Officer Dashboard** - Wellness trends, SOS management

---

## 📋 STEP-BY-STEP DEMO INSTRUCTIONS

### STEP 1: Start All Services

Open **3 separate PowerShell/CMD windows**:

#### Window 1: ML Service
```powershell
cd backend-ml
python main.py
```
**Wait for**: "Application startup complete" message
**Port**: 8001

#### Window 2: Backend API
```powershell
cd backend-api
npm start
```
**Wait for**: "Server running on port 3000" message
**Port**: 3000

#### Window 3: Frontend
```powershell
cd frontend
npm run dev
```
**Wait for**: "Local: http://localhost:5173"
**Port**: 5173

---

### STEP 2: Open Browser

Navigate to: **http://localhost:5173**

---

### STEP 3: Demo Each Feature

## 🎯 Feature 1: LOGIN (Demo Mode)

1. You'll see 5 role cards
2. Click **any role card** (no password needed)
3. You're logged in!

**Roles Available:**
- Station Commander
- Logistics Officer  
- Field Crew
- Medical Officer
- HQ Admin

---

## 🎯 Feature 2: STATION COMMANDER DASHBOARD

**What works:**

### A) Inventory Management
1. See 4 KPI cards at top (Personnel, Low Inventory, Alerts, SOS)
2. Scroll down to "Inventory Management" section
3. See 3 inventory items with current quantities

### B) Add New Inventory Item
1. Click **"Add Item"** button (top right of inventory section)
2. Modal opens
3. Fill in:
   - Item Name: "Test Fuel"
   - Category: Select "FUEL"
   - Quantity: 500
   - Unit: "liters"
   - Min Threshold: 100
   - Daily Consumption: 10
4. Click **"Add Inventory Item"**
5. Toast notification appears: "Inventory item added successfully!"
6. Item appears in list

### C) Run Forecast
1. Find any item without forecast
2. Click **"Run Forecast"** button
3. Button shows "Computing..." state
4. After 2-3 seconds:
   - Chart appears showing depletion prediction
   - Predicted date shown
   - Confidence band displayed
5. Toast notification: "Forecast generated successfully!"

**NOTE**: Works even if ML service is down (uses fallback calculation)

### D) Export Data
1. Click **"Export"** dropdown button
2. Select "Export as CSV" or "Export as JSON"
3. File downloads automatically
4. Toast notification confirms export

### E) View Station Roster
1. Scroll down to "Station Roster" section
2. See all personnel at your station
3. Name, role, specialization displayed

### F) View Risk Alerts
1. Scroll to "Station Risk Alerts"
2. See active unread alerts
3. Severity badges color-coded:
   - 🔴 CRITICAL (red, pulsing)
   - 🟡 HIGH (amber)
   - 🔵 MEDIUM (blue)

### G) System Health Monitor
1. Scroll to bottom
2. "System Health" card shows:
   - Backend API status
   - Database connection
   - ML service status
   - Response times

---

## 🎯 Feature 3: LOGISTICS OFFICER DASHBOARD

**What works:**

### A) View KPIs
1. See 4 cards: Total Cargo, Computed Routes, Active Hazards, Optimization %

### B) Compute Safe Route ⭐
1. Find "A* Route Planner" section
2. Select **"From Station"**: Maitri Station
3. Select **"To Station"**: Bharati Station
4. Click **"Compute Safe Route"** button
5. Button shows "Computing..." with animation
6. After 2-3 seconds:
   - Route appears on map (blue line)
   - Distance and time displayed below map
   - Hazards shown as red markers
   - Explanation shows A* algorithm details
7. Toast notification: "Safe route computed successfully!"

**NOTE**: Works with ML service for real A* pathfinding, or shows direct route if ML down

### C) View Cargo Shipment Timeline ⭐ (NEW!)
1. Scroll down to "Cargo Shipment Status"
2. See visual timeline with 4 stages:
   - ✅ Cargo Loaded (complete - green)
   - ✅ Route Validated (complete - green)
   - 🔵 In Transit (current - blue, animated)
   - ⚪ Delivery Expected (upcoming - gray)

### D) Optimize Cargo (Knapsack)
1. Scroll to "Cargo Knapsack" section
2. Select a manifest from dropdown
3. Click **"Optimize load"**
4. See:
   - Pie chart showing capacity utilization
   - Selected items list
   - Excluded items with reasons
   - Total weight/volume/priority

### E) View Active Hazards
1. Scroll to "Active Hazards" table
2. See all hazards with:
   - Type (CREVASSE, WHITEOUT, etc.)
   - GPS coordinates
   - Severity badge
   - Data source badge

---

## 🎯 Feature 4: FIELD CREW DASHBOARD

**What works:**

### A) Send SOS Emergency ⭐
1. Big red "Emergency SOS" card at top
2. Type message: "Equipment malfunction, need help"
3. Click **"SEND SOS NOW"** button
4. SOS sent to database
5. Alert notification appears for HQ Admin
6. Toast confirmation shown

**NOTE**: Works offline too! Messages queue and sync when online

### B) Submit Wellness Check-in
1. Scroll to "Daily wellness" section
2. Adjust sliders:
   - Mood: 1-10
   - Fatigue: 1-10
   - Stress: 1-10
3. Enter sleep hours: 7.5
4. Click **"Submit check-in"**
5. Data saved to database
6. Toast confirmation
7. Appears in "Recent check-ins" below

### C) View Station Inventory
1. Scroll to "Station inventory"
2. See current stock levels
3. Low items shown in red

### D) Offline Mode Testing
1. Stop backend (Ctrl+C in backend window)
2. Try submitting wellness or SOS
3. Yellow banner shows "OFFLINE MODE"
4. Actions are queued locally
5. Restart backend
6. Actions auto-sync when reconnected

---

## 🎯 Feature 5: HQ ADMIN DASHBOARD

**What works:**

### A) View System Stats
1. See 4 KPI cards:
   - Active Stations
   - Critical Alerts
   - Total Personnel
   - Audit Events

### B) Unified Live Map
1. Map shows all stations
2. Click station markers for details
3. Color-coded by status:
   - 🟢 Green = Active
   - 🔴 Red = Issues

### C) Combined Risk Alerts
1. See high-priority correlation alerts
2. AI-generated explanations
3. Data provenance badges show confidence

### D) Station Status Cards
1. See all stations listed
2. Occupancy ratios
3. Status badges

### E) Live Audit Feed
1. Terminal-style log viewer
2. Shows recent system events
3. Real-time activity tracking

---

## 🎯 Feature 6: MEDICAL OFFICER DASHBOARD

**What works:**

### A) View Medical KPIs
1. Active Personnel count
2. Average Mood Score across all crew
3. Open SOS count

### B) Wellbeing Trend Chart
1. Interactive line chart
2. Shows mood vs fatigue over time
3. Multi-day trends for specific personnel

### C) Recent Check-ins
1. List of latest wellness submissions
2. Color-coded metrics
3. Date stamps

### D) SOS Events Management
1. See emergency events
2. Severity badges
3. Status tracking
4. Can view and resolve

---

## 🧪 Testing Each ML Engine

### Test 1: A* Pathfinding ✓
**Dashboard**: Logistics Officer
**Action**: Compute Safe Route
**Result**: Blue line on map, distance calculated

### Test 2: Prophet Forecasting ✓
**Dashboard**: Station Commander
**Action**: Run Forecast on inventory item
**Result**: Chart with predicted depletion date

### Test 3: NLP Triage ✓
**Dashboard**: Field Crew
**Action**: Send SOS with message
**Result**: Message auto-categorized as MEDICAL/EQUIPMENT/etc.

### Test 4: Knapsack Optimization ✓
**Dashboard**: Logistics Officer
**Action**: Optimize cargo load
**Result**: Optimal item selection with utilization %

---

## 🎨 UI Features to Notice

### Typography System ✓
- Headings use elegant serif font (Source Serif 4)
- Data uses monospace font for clarity
- Professional, production-ready look

### Status Badges ✓
- Color-coded by severity
- Solid vs subtle variants
- Uppercase, consistent style

### Interactive Buttons ✓
- Idle → Running → Success states
- Visual feedback with animations
- Loading spinners

### Toast Notifications ✓
- Success (green)
- Error (red)
- Warning (yellow)
- Info (blue)
- Auto-dismiss after 5 seconds

### Export Functionality ✓
- Dropdown with CSV/JSON options
- Instant download
- All data tables exportable

### Timeline Component ✓ (NEW!)
- Visual progress tracking
- Color-coded stages
- Date milestones

---

## ❗ Important Notes

### What Requires ML Service:
- ✅ Route computation (has fallback)
- ✅ Inventory forecast (has fallback)
- ✅ SOS triage (has fallback - uses manual category)
- ✅ Cargo optimization (works without ML)

### What Works Without ML:
- ✅ All dashboards load
- ✅ Data viewing
- ✅ Add inventory
- ✅ Export data
- ✅ SOS submission
- ✅ Wellness tracking
- ✅ Map visualization
- ✅ All UI components

---

## 🐛 Troubleshooting

### Issue: Buttons not clickable
**Fix**: Make sure all 3 services are running

### Issue: "Failed to fetch"
**Fix**: Check backend API is running on port 3000

### Issue: ML features timeout
**Fix**: ML service takes 3-5 seconds on first call (model loading)
**Solution**: It will work, just wait a bit longer

### Issue: No data showing
**Fix**: Database might be empty
**Solution**: Use "Add Item" or other creation features

### Issue: Route computation fails
**Fix**: ML service may not be running
**Solution**: It will show fallback direct route

---

## ✅ Success Criteria

If you can do these, system is working:

1. ✅ Login with any role
2. ✅ See dashboard with data
3. ✅ Click "Add Item" and add inventory
4. ✅ Click "Run Forecast" and see chart
5. ✅ Click "Compute Route" and see blue line on map
6. ✅ Submit wellness check-in
7. ✅ Send SOS emergency
8. ✅ Export data as CSV
9. ✅ See toast notifications
10. ✅ Navigate between dashboards

---

## 🎉 All Features Working!

Your Antarctic Research Station Management System is fully functional with:

- ✅ 5 role-based dashboards
- ✅ 4 real ML engines (A*, Prophet, NLP, Knapsack)
- ✅ Real-time data sync
- ✅ Offline-first PWA
- ✅ Professional UI with modern components
- ✅ Complete CRUD operations
- ✅ Live maps with Leaflet
- ✅ Interactive charts
- ✅ Export functionality
- ✅ Timeline tracking
- ✅ Toast notifications
- ✅ Emergency SOS system
- ✅ Wellness monitoring
- ✅ Cargo optimization
- ✅ Route planning

**Ready for SIH demo!** 🚀
