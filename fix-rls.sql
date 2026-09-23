-- Fix RLS Policy for Personnel Table
-- This allows users to read their own personnel record using user_id
-- which is needed during the initial authentication flow

CREATE POLICY "Users can read own personnel by user_id"
    ON personnel FOR SELECT
    USING (user_id = auth.uid());
