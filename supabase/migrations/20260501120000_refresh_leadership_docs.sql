-- Remove old leadership docs, keep the new freshly inserted ones (created today)
DELETE FROM public.documents
WHERE category = 'leadership'
  AND created_at < (now() - interval '1 hour');
