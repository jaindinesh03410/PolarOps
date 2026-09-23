# 🧪 SOS Testing Guide

## Error: "Supabase catch is not found"

This error usually means:
1. **Syntax error in code** (but we checked - no issues)
2. **Browser cache issue** (need hard refresh)
3. **Build not updated** (need restart)

## ✅ Quick Fix Steps:

### Step 1: Stop All Services
Press **Ctrl+C** in all terminals to stop:
- Frontend
- Backend API
- ML Service (if running)

### Step 2: Clear Browser Cache
**Option A - Hard Refresh:**
- Windows: `Ctrl + Shift + R`
- Or: `Ctrl + F5`

**Option B - Clear All:**
1. Open Dev Tools (F12)
2. Right-click on refresh button
3. Click "Empty Cache and Hard Reload"

### Step 3: Restart Services

**Terminal 1 - Backend:**
```bash
cd backend-api
npm start
```
Wait for: "Server running on port 3000"

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Wait for: "Local: http://localhost:5173"

### Step 4: Test SOS Again

1. Open **NEW browser tab**: http://localhost:5173
2. Login as **Field Crew**
3. Type message: "Test emergency"
4. Click **"SEND SOS NOW"**

---

## 🔍 If Still Not Working

### Check 1: Backend Logs
Look in backend terminal for:
```
📥 SOS Request received: {...}
```

If you see error there, that's the real issue.

### Check 2: Browser Console
Press **F12** → Console tab

Look for errors. Copy exact error message.

### Check 3: Network Tab
1. F12 → Network tab
2. Click "Send SOS NOW"
3. Look for `/api/sos` request
4. Click on it → Preview tab
5. See exact error response

---

## 🎯 Expected Behavior

### When Working Correctly:

**Browser Console:**
```
📡 Sending SOS: {message: "Test emergency", personnel_id: "...", station_id: "..."}
✅ SOS sent successfully: {id: "...", event_code: "SOS-2025-..."}
```

**Backend Terminal:**
```
📥 SOS Request received: {message: "Test emergency"}
✅ ML triage successful: OTHER
💾 Saving SOS event
✅ SOS saved with ID: xxx-xxx-xxx-xxx
✅ SOS complete - Event: SOS-2025-123456
```

**Browser UI:**
- Green toast appears: "SOS sent successfully!"
- Message clears from textarea
- Button returns to normal

---

## 🐛 Common Issues & Fixes

### Issue 1: "Failed to fetch"
**Cause:** Backend not running
**Fix:** 
```bash
cd backend-api
npm start
```

### Issue 2: "Network Error"
**Cause:** Wrong API URL
**Fix:** Check `frontend/.env`:
```
VITE_API_URL=http://localhost:3000/api
```

### Issue 3: "Personnel data not available"
**Cause:** Not logged in properly
**Fix:** Refresh page and login again

### Issue 4: Button stays disabled
**Cause:** Empty message
**Fix:** Type something in textarea

### Issue 5: "Supabase error"
**Cause:** Database connection issue
**Fix:** Check backend logs for actual Supabase error

---

## 💡 Alternative Test Method

If Field Crew dashboard has issues, test SOS via **API directly**:

### Using curl (in separate terminal):
```bash
curl -X POST http://localhost:3000/api/sos \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Test SOS\",\"severity\":\"MEDIUM\",\"personnel_id\":\"a0000000-0000-0000-0000-000000000011\",\"station_id\":\"a0000000-0000-0000-0000-000000000001\"}"
```

### Using Postman or Thunder Client:
```
POST http://localhost:3000/api/sos
Content-Type: application/json

{
  "message": "Test emergency via API",
  "severity": "MEDIUM",
  "personnel_id": "a0000000-0000-0000-0000-000000000011",
  "station_id": "a0000000-0000-0000-0000-000000000001"
}
```

**Expected Response:**
```json
{
  "id": "...",
  "event_code": "SOS-2025-123456",
  "message": "Test emergency via API",
  "severity": "MEDIUM",
  "status": "OPEN",
  ...
}
```

---

## ✅ Verification Checklist

- [ ] Backend running on port 3000
- [ ] Frontend running on port 5173
- [ ] Browser cache cleared
- [ ] Logged in as Field Crew
- [ ] Message typed in textarea
- [ ] Button not disabled
- [ ] Console shows no errors
- [ ] Network tab shows 200 OK response

---

## 📞 Debug Commands

### Test Backend Health:
```bash
curl http://localhost:3000/api/health
```
Should return: `{"status":"healthy"}`

### Test Supabase Connection:
```bash
cd backend-api
node test-supabase.js
```
Should show: `✅ Supabase Connected!`

### Check Backend Logs:
Look in backend terminal for any red error messages

### Check Frontend Build:
```bash
cd frontend
npm run build
```
Should complete without errors

---

## 🎉 When It Works

You'll see this sequence:

1. **Type message** → Button enabled
2. **Click button** → Shows "SENDING..."
3. **Wait 1-2 sec** → Green toast appears ✅
4. **Message clears** → Ready for next SOS
5. **Console** → Success logs
6. **Backend** → SOS saved logs
7. **Database** → New row in sos_events table

---

Agar phir bhi issue hai to exact error message bhejo, main fix kar dunga! 🔧
