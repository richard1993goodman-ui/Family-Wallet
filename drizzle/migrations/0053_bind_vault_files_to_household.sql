DROP POLICY IF EXISTS "Members read their vault files" ON storage.objects;
CREATE POLICY "Members read their vault files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'family-docs' AND EXISTS (
    SELECT 1 FROM public.wallet_documents d
    WHERE d.storage_path = objects.name
      AND (
        public.is_household_owner(d.family_id)
        OR (d.shared_with_staff AND public.my_staff_nanny(d.family_id) IS NOT NULL)
        OR (d.nanny_id IS NOT NULL AND d.nanny_id = public.my_staff_nanny(d.family_id))
      )
  )
);