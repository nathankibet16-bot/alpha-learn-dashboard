
-- MPESA SETTINGS (single row, admin managed)
CREATE TABLE public.mpesa_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  usd_to_kes_rate numeric NOT NULL DEFAULT 129,
  kes_to_usd_rate numeric NOT NULL DEFAULT 129,
  deposit_fee_kes numeric NOT NULL DEFAULT 0,
  withdrawal_fee_percent numeric NOT NULL DEFAULT 8,
  withdrawal_fee_fixed_kes numeric NOT NULL DEFAULT 0,
  min_deposit_kes numeric NOT NULL DEFAULT 500,
  min_withdrawal_kes numeric NOT NULL DEFAULT 5000,
  max_withdrawal_kes numeric NOT NULL DEFAULT 300000,
  daily_withdrawal_limit_kes numeric NOT NULL DEFAULT 500000,
  deposits_enabled boolean NOT NULL DEFAULT true,
  withdrawals_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mpesa_settings TO authenticated;
GRANT ALL ON public.mpesa_settings TO service_role;
ALTER TABLE public.mpesa_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read settings" ON public.mpesa_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update settings" ON public.mpesa_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.mpesa_settings (id) VALUES (true);

-- MPESA DEPOSITS
CREATE TABLE public.mpesa_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  internal_reference text UNIQUE NOT NULL,
  amount_kes numeric NOT NULL CHECK (amount_kes > 0),
  exchange_rate numeric NOT NULL,
  credited_amount_usd numeric NOT NULL,
  fee_kes numeric NOT NULL DEFAULT 0,
  total_paid_kes numeric NOT NULL,
  phone text NOT NULL,
  provider_reference text,
  checkout_request_id text,
  merchant_request_id text,
  mpesa_receipt text,
  status text NOT NULL DEFAULT 'pending',
  credited boolean NOT NULL DEFAULT false,
  provider_response jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  credited_at timestamptz
);
CREATE UNIQUE INDEX mpesa_deposits_checkout_request_id_key ON public.mpesa_deposits(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE UNIQUE INDEX mpesa_deposits_receipt_key ON public.mpesa_deposits(mpesa_receipt) WHERE mpesa_receipt IS NOT NULL;
GRANT SELECT, INSERT ON public.mpesa_deposits TO authenticated;
GRANT ALL ON public.mpesa_deposits TO service_role;
ALTER TABLE public.mpesa_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own deposits" ON public.mpesa_deposits FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own deposits" ON public.mpesa_deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- MPESA WITHDRAWALS
CREATE TABLE public.mpesa_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  internal_reference text UNIQUE NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  exchange_rate numeric NOT NULL,
  gross_amount_kes numeric NOT NULL,
  fee_kes numeric NOT NULL DEFAULT 0,
  net_amount_kes numeric NOT NULL,
  phone text NOT NULL,
  provider_reference text,
  mpesa_receipt text,
  status text NOT NULL DEFAULT 'pending',
  balance_reserved boolean NOT NULL DEFAULT false,
  balance_deducted boolean NOT NULL DEFAULT false,
  refunded boolean NOT NULL DEFAULT false,
  provider_response jsonb,
  failure_reason text,
  reviewed_by uuid,
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  processed_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz
);
CREATE UNIQUE INDEX mpesa_withdrawals_provider_ref_key ON public.mpesa_withdrawals(provider_reference) WHERE provider_reference IS NOT NULL;
CREATE UNIQUE INDEX mpesa_withdrawals_receipt_key ON public.mpesa_withdrawals(mpesa_receipt) WHERE mpesa_receipt IS NOT NULL;
GRANT SELECT ON public.mpesa_withdrawals TO authenticated;
GRANT ALL ON public.mpesa_withdrawals TO service_role;
ALTER TABLE public.mpesa_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own withdrawals" ON public.mpesa_withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- WALLET LEDGER
CREATE TABLE public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_type text NOT NULL,
  amount_usd numeric NOT NULL,
  balance_after numeric NOT NULL,
  reference_type text,
  reference_id uuid,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_ledger_user_id_idx ON public.wallet_ledger(user_id, created_at DESC);
GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ledger" ON public.wallet_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_mpesa_deposits_updated BEFORE UPDATE ON public.mpesa_deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mpesa_withdrawals_updated BEFORE UPDATE ON public.mpesa_withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic credit deposit (idempotent — called from webhook)
CREATE OR REPLACE FUNCTION public.credit_mpesa_deposit(
  _internal_reference text,
  _mpesa_receipt text,
  _provider_reference text,
  _provider_response jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dep public.mpesa_deposits%ROWTYPE; _new_bal numeric;
BEGIN
  SELECT * INTO _dep FROM public.mpesa_deposits WHERE internal_reference = _internal_reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found: %', _internal_reference; END IF;
  IF _dep.credited THEN RETURN; END IF;

  UPDATE public.profiles SET balance = balance + _dep.credited_amount_usd
    WHERE id = _dep.user_id RETURNING balance INTO _new_bal;

  UPDATE public.mpesa_deposits SET
    status = 'completed', credited = true,
    mpesa_receipt = _mpesa_receipt,
    provider_reference = COALESCE(_provider_reference, provider_reference),
    provider_response = _provider_response,
    completed_at = now(), credited_at = now()
  WHERE id = _dep.id;

  INSERT INTO public.wallet_ledger (user_id, entry_type, amount_usd, balance_after, reference_type, reference_id, memo)
    VALUES (_dep.user_id, 'mpesa_deposit', _dep.credited_amount_usd, _new_bal, 'mpesa_deposit', _dep.id, _mpesa_receipt);
END;
$$;

-- Mark deposit failed
CREATE OR REPLACE FUNCTION public.fail_mpesa_deposit(_internal_reference text, _reason text, _response jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.mpesa_deposits SET status = 'failed', failure_reason = _reason, provider_response = _response
    WHERE internal_reference = _internal_reference AND credited = false;
END; $$;

-- Reserve balance for withdrawal (called from server fn as user)
CREATE OR REPLACE FUNCTION public.reserve_mpesa_withdrawal(
  _amount_usd numeric, _exchange_rate numeric, _gross_kes numeric, _fee_kes numeric,
  _net_kes numeric, _phone text, _internal_reference text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _bal numeric; _new_bal numeric; _wid uuid; _email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT balance, email INTO _bal, _email FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _amount_usd THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET balance = balance - _amount_usd WHERE id = _uid RETURNING balance INTO _new_bal;

  INSERT INTO public.mpesa_withdrawals (
    user_id, user_email, internal_reference, amount_usd, exchange_rate, gross_amount_kes,
    fee_kes, net_amount_kes, phone, status, balance_reserved
  ) VALUES (
    _uid, _email, _internal_reference, _amount_usd, _exchange_rate, _gross_kes,
    _fee_kes, _net_kes, _phone, 'pending', true
  ) RETURNING id INTO _wid;

  INSERT INTO public.wallet_ledger (user_id, entry_type, amount_usd, balance_after, reference_type, reference_id, memo)
    VALUES (_uid, 'mpesa_withdrawal_reserve', -_amount_usd, _new_bal, 'mpesa_withdrawal', _wid, _internal_reference);

  RETURN _wid;
END; $$;

-- Admin completes withdrawal after paying out via CloudPay dashboard
CREATE OR REPLACE FUNCTION public.admin_complete_mpesa_withdrawal(
  _withdrawal_id uuid, _mpesa_receipt text, _provider_reference text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wd public.mpesa_withdrawals%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _wd FROM public.mpesa_withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF _wd.status IN ('completed','refunded') THEN RAISE EXCEPTION 'Already processed'; END IF;

  UPDATE public.mpesa_withdrawals SET
    status = 'completed', balance_deducted = true,
    mpesa_receipt = _mpesa_receipt, provider_reference = COALESCE(_provider_reference, provider_reference),
    processed_by = auth.uid(), processed_at = now(), completed_at = now()
  WHERE id = _withdrawal_id;
END; $$;

-- Admin rejects/refunds withdrawal — releases reservation back to balance
CREATE OR REPLACE FUNCTION public.admin_refund_mpesa_withdrawal(_withdrawal_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wd public.mpesa_withdrawals%ROWTYPE; _new_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _wd FROM public.mpesa_withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF _wd.refunded OR _wd.balance_deducted THEN RAISE EXCEPTION 'Cannot refund'; END IF;

  UPDATE public.profiles SET balance = balance + _wd.amount_usd WHERE id = _wd.user_id RETURNING balance INTO _new_bal;

  UPDATE public.mpesa_withdrawals SET
    status = 'refunded', refunded = true, failure_reason = _reason,
    processed_by = auth.uid(), refunded_at = now()
  WHERE id = _withdrawal_id;

  INSERT INTO public.wallet_ledger (user_id, entry_type, amount_usd, balance_after, reference_type, reference_id, memo)
    VALUES (_wd.user_id, 'mpesa_withdrawal_refund', _wd.amount_usd, _new_bal, 'mpesa_withdrawal', _wd.id, COALESCE(_reason, 'refund'));
END; $$;
