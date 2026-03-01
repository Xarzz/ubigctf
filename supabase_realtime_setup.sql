-- ============================================================
-- SUPABASE SETUP: Realtime + RLS for LKS features
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Enable Realtime for tables used in live features
ALTER PUBLICATION supabase_realtime ADD TABLE lks_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE lks_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE challenges;

-- 2. RLS Policy: Allow users to delete their OWN participant record
--    (needed for auto-leave via sendBeacon when tab is closed)
CREATE POLICY "Users can remove themselves from a room"
    ON lks_participants
    FOR DELETE
    USING (auth.uid() = user_id);

-- 3. RLS Policy: Allow admins to delete ANY participant record
--    (needed for kick player feature)
--    Assumes your admin role is stored in profiles.role = 'admin'
CREATE POLICY "Admins can remove any participant"
    ON lks_participants
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- NOTE: If you already have these policies, you can skip them.
-- If you have a SUPABASE_SERVICE_ROLE_KEY, add it to .env.local:
--   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
-- This bypasses RLS in the API route for reliable auto-leave even
-- when the user's auth token isn't available during tab close.
