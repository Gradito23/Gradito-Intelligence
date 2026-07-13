-- Unique month+day for holidays (recurring annual dates cannot collide).
CREATE UNIQUE INDEX IF NOT EXISTS holidays_month_day_unique
  ON public.holidays (month, day)
  WHERE month IS NOT NULL AND day IS NOT NULL;

-- Down:
-- DROP INDEX IF EXISTS public.holidays_month_day_unique;
