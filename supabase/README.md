# Supabase Database Setup

## Quick Setup Steps

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Note your project URL and API keys

2. **Run Migrations**
   ```bash
   # Connect to your Supabase project SQL editor and run in order:
   1. schema.sql
   2. audit-triggers.sql
   3. rls-policies.sql
   4. seed-data.sql
   ```

3. **Create Auth Users**
   In Supabase Dashboard > Authentication > Users, create test users:
   - rajesh.kumar@ncaor.gov.in (HQ Admin)
   - anil.sharma@maitri.ant (Station Commander)
   - vikram.patel@maitri.ant (Logistics Officer)
   - priya.singh@maitri.ant (Medical Officer)
   - ramesh.gupta@maitri.ant (Field Crew)

   Set passwords for each.

4. **Link Auth Users to Personnel**
   After creating auth users, update personnel table:
   ```sql
   UPDATE personnel 
   SET user_id = (SELECT id FROM auth.users WHERE email = 'rajesh.kumar@ncaor.gov.in')
   WHERE email = 'rajesh.kumar@ncaor.gov.in';
   -- Repeat for all personnel
   ```

5. **Update Environment Files**
   Copy your Supabase URL and keys to:
   - `backend-api/.env`
   - `frontend/.env`

## Tables Created
- stations, personnel, roster_movements
- inventory_items, inventory_forecasts
- cargo_manifests, cargo_optimizations
- routes, hazards
- sos_events, wellness_checkins
- alerts, compliance_flags
- audit_logs (with auto-triggers)

## Security
- Row Level Security (RLS) enabled on all tables
- Role-based access control enforced
- Audit logging automatic via triggers
