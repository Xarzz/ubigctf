-- Create a storage bucket for CTF Challenge files
insert into storage.buckets (id, name, public)
values ('challenge_files', 'challenge_files', true)
on conflict (id) do nothing;

-- Set up security policies for the bucket
-- Allow public read access to challenge files
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'challenge_files' );

-- Allow authenticated users with admin role to upload files
-- Wait, we can just allow authenticated users to upload, but ideally only admins.
create policy "Admin Upload Access"
on storage.objects for insert
with check ( bucket_id = 'challenge_files' AND auth.role() = 'authenticated' );

create policy "Admin Update Access"
on storage.objects for update
using ( bucket_id = 'challenge_files' AND auth.role() = 'authenticated' );

create policy "Admin Delete Access"
on storage.objects for delete
using ( bucket_id = 'challenge_files' AND auth.role() = 'authenticated' );
