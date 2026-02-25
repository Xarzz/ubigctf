-- Run this in your Supabase SQL Editor

-- 1. FIRST: Ensure the profiles table can store whether it's a team or user 
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS type text DEFAULT 'user';

-- 2. SECOND: Create the leaderboard view 
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    p.id,
    p.username as name,
    -- Assume we add a 'type' column to profiles (user/team). Default to 'user' for now.
    COALESCE(p.type, 'user') as type,
    -- Sum of points from distinct solved challenges
    COALESCE(SUM(c.points), 0) as score,
    -- Count of distinct solved challenges
    COUNT(DISTINCT s.challenge_id) as solved,
    -- Get the time of their last submission to break ties
    MAX(s.submitted_at) as last_submission_time
FROM 
    profiles p
LEFT JOIN 
    submissions s ON p.id = s.user_id AND s.is_correct = true
LEFT JOIN 
    challenges c ON s.challenge_id = c.id
WHERE
    p.role != 'admin' OR p.role IS NULL
GROUP BY 
    p.id, p.username, p.type, p.role
ORDER BY 
    score DESC, last_submission_time ASC
LIMIT 30;
