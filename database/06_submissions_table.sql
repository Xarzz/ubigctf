-- Submissions Table to track who submitted what, and if they got it right or wrong.
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    submitted_flag VARCHAR(255) NOT NULL, -- What the user typed
    is_correct BOOLEAN DEFAULT FALSE,     -- Was it correct?
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- (VITAL) Prevent the same user from getting points from the same challenge multiple times.
-- Even though they might submit 5 wrong flags, we only want ONE 'correct' submission per user/challenge pair to count.
-- You can handle this via unique indexes or application logic checks.

-- Add a UNIQUE INDEX to prevent double-solves
CREATE UNIQUE INDEX once_per_challenge 
ON submissions (user_id, challenge_id) 
WHERE is_correct = true;
