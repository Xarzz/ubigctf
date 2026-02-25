-- Run this to upgrade your database for Admin functionality

-- 1. Add a 'role' column to the profiles table. Default to 'user'.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- 2. Once this is executed, you can manually set your own account to 'admin' using the Supabase Dashboard
-- Or via a query like this (replace the email with your actual registered admin email):
-- UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL@example.com';
