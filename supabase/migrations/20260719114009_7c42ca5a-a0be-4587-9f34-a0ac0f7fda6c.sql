CREATE TABLE public.email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  recipient text NOT NULL,
  email_type text NOT NULL,
  provider text,
  provider_message_id text,
  sender text,
  status text NOT NULL CHECK (status IN ('queued','accepted','delivered','bounced','rejected','complained','failed','suppressed')),
  provider_status text,
  error_code text,
  error_message text,
  environment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  delivered_at timestamp with time zone NULL,
  failed_at timestamp with time zone NULL
);

GRANT SELECT ON public.email_delivery_logs TO authenticated;
GRANT INSERT, UPDATE, DELETE, SELECT ON public.email_delivery_logs TO service_role;

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX email_delivery_logs_recipient_created_idx ON public.email_delivery_logs (recipient, created_at DESC);
CREATE INDEX email_delivery_logs_status_created_idx ON public.email_delivery_logs (status, created_at DESC);
CREATE INDEX email_delivery_logs_message_id_idx ON public.email_delivery_logs (provider_message_id) WHERE provider_message_id IS NOT NULL;