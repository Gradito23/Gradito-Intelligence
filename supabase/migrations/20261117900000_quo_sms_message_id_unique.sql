-- One row per Quo SMS message id (prevent duplicate outbound send + delivery webhook rows)

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY quo_message_id
      ORDER BY
        (sent_by_profile_id IS NOT NULL) DESC,
        created_at ASC
    ) AS rn
  FROM public.quo_communication_events
  WHERE channel = 'sms'
    AND direction = 'outbound'
    AND quo_message_id IS NOT NULL
)
DELETE FROM public.quo_communication_events
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quo_communication_events_quo_message_id
  ON public.quo_communication_events (quo_message_id)
  WHERE quo_message_id IS NOT NULL AND channel = 'sms';