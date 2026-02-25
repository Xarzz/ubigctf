-- Run this in your Supabase SQL Editor to fill your dummy Top Hackers

-- Note: If your 'profiles' table has a strict Foreign Key linked to 'auth.users' (Primary Key), 
-- these direct inserts might fail. If that happens, you need to either temporarily remove the foreign key,
-- or create users one-by-one in the Supabase Authentication Dashboard first.
-- Assuming no strict constraints, here is the dummy data:

INSERT INTO profiles (id, username, email, score, type)
VALUES 
    (gen_random_uuid(), 'Mentee Squad 1', 'squad1@ubigctf.local', 4500, 'team'),
    (gen_random_uuid(), 'Hackerman', 'hacker@ubigctf.local', 4120, 'user'),
    (gen_random_uuid(), 'Null Pointers', 'null0@ubigctf.local', 3800, 'team'),
    (gen_random_uuid(), 'Syntax Errors', 'syntax@ubigctf.local', 3550, 'team'),
    (gen_random_uuid(), 'The Penguins', 'pingu@ubigctf.local', 3100, 'team'),
    (gen_random_uuid(), 'Drop Tables', 'drop@ubigctf.local', 2850, 'team'),
    (gen_random_uuid(), '0xDeadBeef', 'beef@ubigctf.local', 2500, 'user'),
    (gen_random_uuid(), 'Script Kiddies', 'skidz@ubigctf.local', 2150, 'team'),
    (gen_random_uuid(), 'Cyber Samurai', 'samurai@ubigctf.local', 1800, 'user'),
    (gen_random_uuid(), 'White Hats', 'white@ubigctf.local', 1650, 'team'),
    (gen_random_uuid(), 'Anonymous', 'anon@ubigctf.local', 1200, 'user'),
    (gen_random_uuid(), 'Neo', 'neo@ubigctf.local', 950, 'user'),
    (gen_random_uuid(), 'Byte Me', 'byte@ubigctf.local', 800, 'team'),
    (gen_random_uuid(), 'Rootkit', 'root@ubigctf.local', 450, 'user'),
    (gen_random_uuid(), 'Flag Hunters', 'flags@ubigctf.local', 150, 'team')
ON CONFLICT (id) DO NOTHING;
