-- Add reference to user who created the challenge
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);
