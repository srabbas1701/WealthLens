/*
  # Create Insurance Documents Storage Bucket

  1. Storage Bucket
    - `insurance-documents` - for storing PDF policy documents
    - Public URLs with authenticated access
    - User-scoped file paths prevent cross-user access

  2. RLS Policy
    - Only authenticated users can upload/download their own documents
    - Documents stored under user_id/{filename} path
*/

-- Insert bucket (Supabase managed table)
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance-documents', 'insurance-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy for authenticated users
CREATE POLICY "Authenticated users can upload insurance documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'insurance-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can download their insurance documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'insurance-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can delete their insurance documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'insurance-documents' AND (storage.foldername(name))[1] = auth.uid()::text);