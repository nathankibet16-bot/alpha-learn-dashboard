DO $$
BEGIN
  IF to_regclass('public.email_delivery_logs') IS NULL THEN
    CREATE TABLE public.email_delivery_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NULL,
      recipient text NOT NULL,
      email_type text NOT NULL,
      provider text,
      provider_message_id text,
      sender text,
      status text NOT NULL,
      provider_status text,
      error_code text,
      error_message text,
      environment text,
      created_at timestamptz NOT NULL DEFAULT now(),
      delivered_at timestamptz NULL,
      failed_at timestamptz NULL
    );
  END IF;
END $$;

ALTER TABLE public.email_delivery_logs
  DROP CONSTRAINT IF EXISTS email_delivery_logs_status_check;

ALTER TABLE public.email_delivery_logs
  ADD CONSTRAINT email_delivery_logs_status_check
  CHECK (status IN ('queued','accepted','delivered','bounced','rejected','complained','failed','suppressed'));

REVOKE ALL ON public.email_delivery_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.email_delivery_logs FROM authenticated;
GRANT SELECT ON public.email_delivery_logs TO authenticated;
GRANT ALL ON public.email_delivery_logs TO service_role;

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_delivery_logs;
DROP POLICY IF EXISTS "Admins can view all email logs" ON public.email_delivery_logs;

CREATE POLICY "Users can view their own email logs"
  ON public.email_delivery_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all email logs"
  ON public.email_delivery_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS email_delivery_logs_created_at_idx ON public.email_delivery_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS email_delivery_logs_status_idx ON public.email_delivery_logs (status);
CREATE INDEX IF NOT EXISTS email_delivery_logs_message_id_idx ON public.email_delivery_logs (provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_delivery_logs_user_id_idx ON public.email_delivery_logs (user_id) WHERE user_id IS NOT NULL;