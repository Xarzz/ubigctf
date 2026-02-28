-- 1. Create LKS Rooms Table
CREATE TABLE lks_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 2. Create Room Challenges Table (Mapping Global Challenges to Room)
CREATE TABLE lks_room_challenges (
    room_id UUID REFERENCES lks_rooms(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, challenge_id)
);

-- 3. Create Participants Table
CREATE TABLE lks_participants (
    room_id UUID REFERENCES lks_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- 4. Create LKS Submissions Table (Isolated from Global Submissions)
CREATE TABLE lks_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES lks_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    is_correct BOOLEAN DEFAULT false,
    submitted_flag TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create LKS Scoreboard View (Isolated Per Room)
CREATE OR REPLACE VIEW lks_scoreboard AS
SELECT 
    p.room_id,
    p.user_id,
    pr.username as name,
    pr.role as type,
    COUNT(s.id) as solved,
    COALESCE(SUM(c.points), 0) as score
FROM lks_participants p
JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN lks_submissions s ON p.user_id = s.user_id AND p.room_id = s.room_id AND s.is_correct = true
LEFT JOIN challenges c ON s.challenge_id = c.id
GROUP BY p.room_id, p.user_id, pr.username, pr.role;

-- 6. Setup RLS (Row Level Security) for LKS Tables
ALTER TABLE lks_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lks_room_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE lks_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE lks_submissions ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for rooms and their challenges
CREATE POLICY "Allow public read of active lks_rooms" ON lks_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public read of lks_room_challenges" ON lks_room_challenges FOR SELECT USING (true);
CREATE POLICY "Allow public read of lks_participants" ON lks_participants FOR SELECT USING (true);
CREATE POLICY "Allow public read of lks_submissions" ON lks_submissions FOR SELECT USING (true);

-- Allow all for admins, but for now we'll keep it simple and allow all authenticated to insert (will restrict via UI)
CREATE POLICY "Allow authenticated insert lks_rooms" ON lks_rooms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert lks_room_challenges" ON lks_room_challenges FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert lks_participants" ON lks_participants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert lks_submissions" ON lks_submissions FOR ALL USING (auth.role() = 'authenticated');

-- In production, the above ALL policies would be restricted to admin only, and users can only insert their own submissions/participants.
