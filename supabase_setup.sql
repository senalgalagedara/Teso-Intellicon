-- ==============================================================================
-- Supabase Schema & Storage Setup
-- Copy and run this script in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Enable UUID Extension (usually pre-enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Storage Bucket for application uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-storage',
  'app-storage',
  true,
  52428800, -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies (Allow public upload, download, and delete for dev template)
-- In production, adjust these policies to restrict access to authenticated users!
CREATE POLICY "Public Storage Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-storage');

CREATE POLICY "Public Storage Insert Access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'app-storage');

CREATE POLICY "Public Storage Update Access"
ON storage.objects FOR UPDATE
USING (bucket_id = 'app-storage');

CREATE POLICY "Public Storage Delete Access"
ON storage.objects FOR DELETE
USING (bucket_id = 'app-storage');

-- 4. Create Documents Table (Stores metadata and AI analysis of files uploaded to storage)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    ai_summary TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Notes / Chat history table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    ai_category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS on tables and add development policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete documents" ON public.documents FOR DELETE USING (true);

CREATE POLICY "Allow public read notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Allow public insert notes" ON public.notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update notes" ON public.notes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete notes" ON public.notes FOR DELETE USING (true);

-- 7. Insert sample records
INSERT INTO public.notes (title, content, ai_category)
VALUES 
    ('Welcome Note', 'This is a sample record from your Supabase PostgreSQL database!', 'Onboarding'),
    ('FastAPI AI Integration', 'FastAPI connects to Python AI libraries to perform analysis, embeddings, and NLP.', 'Architecture')
ON CONFLICT DO NOTHING;
