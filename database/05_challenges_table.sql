-- Run this in your Supabase SQL Editor

-- 1. Create the categories table
CREATE TABLE public.categories (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Insert default categories
INSERT INTO public.categories (name) 
VALUES 
  ('Web Exploitation'), 
  ('Cryptography'), 
  ('Reverse Engineering'), 
  ('OSINT'), 
  ('Forensics'), 
  ('Binary Exploitation');

-- 3. Create the challenges table
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- We link this to the categories table you just created above
    category_id UUID REFERENCES public.categories(id) NOT NULL,
    
    points INTEGER NOT NULL DEFAULT 50,
    difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Insane')),
    flag VARCHAR(255) NOT NULL, -- The actual secret CTF flag
    target_url TEXT, -- Use this for aaPanel Shared Instance/Server IP links
    target_port INTEGER, -- In case there's a specific netcat port connection
    file_url TEXT, -- In case they need to download a binary, PDF, PCAP file, etc.
    hints TEXT[], -- Array of hints. E.g. {"Hint 1: Look at the headers", "Hint 2: Base64"}
    is_active BOOLEAN DEFAULT TRUE,
    author VARCHAR(255) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Notes: 
-- You might also need to update submissions table to use public.challenges
