
-- Helper: attach provider identifiers to a deposit (called by server after STK push).
-- SECURITY DEFINER lets our server function update these columns even though the
-- user-facing RLS on mpesa_deposits only allows INSERT/SELECT.
CREATE OR REPLACE FUNCTION public.attach_mpesa_provider_ids(
  _internal_reference text,
  _provider_reference text,
  _checkout_request_id text,
  _merchant_request_id text,
  _provider_response jsonb,
  _status text,
  _failure_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mpesa_deposits
     SET provider_reference   = COALESCE(_provider_reference, provider_reference),
         checkout_request_id  = COALESCE(_checkout_request_id, checkout_request_id),
         merchant_request_id  = COALESCE(_merchant_request_id, merchant_request_id),
         provider_response    = COALESCE(_provider_response, provider_response),
         status               = COALESCE(_status, status),
         failure_reason       = COALESCE(_failure_reason, failure_reason)
   WHERE internal_reference = _internal_reference;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_mpesa_provider_ids(text,text,text,text,jsonb,text,text) TO authenticated, service_role;

-- Resolve a deposit's internal_reference from any of the provider IDs the
-- webhook might send. Returns NULL if not found.
CREATE OR REPLACE FUNCTION public.resolve_mpesa_deposit_ref(
  _internal_reference text,
  _provider_reference text,
  _checkout_request_id text
) RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT internal_reference FROM public.mpesa_deposits
   WHERE (_internal_reference IS NOT NULL AND internal_reference   = _internal_reference)
      OR (_checkout_request_id IS NOT NULL AND checkout_request_id = _checkout_request_id)
      OR (_provider_reference  IS NOT NULL AND provider_reference  = _provider_reference)
   ORDER BY created_at DESC
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_mpesa_deposit_ref(text,text,text) TO authenticated, service_role;
