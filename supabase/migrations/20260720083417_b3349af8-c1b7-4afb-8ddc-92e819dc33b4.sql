
-- Auto-expire stale M-Pesa deposits that never got a webhook callback
CREATE OR REPLACE FUNCTION public.expire_stuck_mpesa_deposits(_older_than_seconds integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _cnt int;
BEGIN
  WITH updated AS (
    UPDATE public.mpesa_deposits
       SET status = 'expired',
           failure_reason = COALESCE(failure_reason, 'No confirmation received in time')
     WHERE credited = false
       AND status IN ('awaiting_customer', 'processing', 'pending')
       AND created_at < now() - make_interval(secs => _older_than_seconds)
     RETURNING 1
  )
  SELECT count(*) INTO _cnt FROM updated;
  RETURN COALESCE(_cnt, 0);
END; $$;

CREATE INDEX IF NOT EXISTS mpesa_deposits_status_created_idx
  ON public.mpesa_deposits (status, created_at)
  WHERE credited = false;
