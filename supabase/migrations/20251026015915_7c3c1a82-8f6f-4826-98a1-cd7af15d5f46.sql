-- Add password field to polls table
ALTER TABLE public.polls 
ADD COLUMN result_password text;