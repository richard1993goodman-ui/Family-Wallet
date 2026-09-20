ALTER TABLE public.support_threads
ADD COLUMN IF NOT EXISTS nanny_unread boolean NOT NULL DEFAULT false;