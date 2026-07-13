-- Public uploads bucket for Base44-compatible UploadFile (PDFs, images)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY uploads_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'uploads');

CREATE POLICY uploads_auth_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY uploads_auth_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY uploads_auth_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
