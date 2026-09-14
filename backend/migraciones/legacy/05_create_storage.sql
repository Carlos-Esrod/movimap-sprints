-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Crear bucket para fotos de incidencias
insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', true)
on conflict do nothing;

-- Políticas de storage
-- Anyone can view incident photos (public bucket)
create policy "Anyone can view incident photos"
on storage.objects for select
to public
using ( bucket_id = 'incident-photos' );

-- Authenticated users can upload incident photos
-- Nota: La validación de tamaño (2MB max) se hace en el frontend con react-hook-form + zod
-- Supabase Storage no valida tamaño directamente en policies
create policy "Authenticated users can upload incident photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'incident-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own incident photos
create policy "Users can update own incident photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'incident-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'incident-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own incident photos
create policy "Users can delete own incident photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'incident-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin can delete any photo
create policy "Admin can delete any photo"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'incident-photos'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
