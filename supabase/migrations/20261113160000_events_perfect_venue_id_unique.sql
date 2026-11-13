-- Full unique index on perfect_venue_id (non-partial) so PostgREST upsert onConflict works.
-- NULLs remain distinct in Postgres UNIQUE, so manual events without PV id are unaffected.

DROP INDEX IF EXISTS public.events_perfect_venue_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS events_perfect_venue_id_key
  ON public.events (perfect_venue_id);
