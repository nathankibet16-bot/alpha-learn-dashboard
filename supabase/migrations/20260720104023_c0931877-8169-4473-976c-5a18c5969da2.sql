
CREATE OR REPLACE FUNCTION public.admin_verify_manual_mpesa_deposit(_deposit_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dep public.mpesa_deposits%ROWTYPE; _new_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _dep FROM public.mpesa_deposits WHERE id = _deposit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF _dep.credited THEN RAISE EXCEPTION 'Already credited'; END IF;
  IF _approve THEN
    UPDATE public.profiles SET balance = balance + _dep.credited_amount_usd
      WHERE id = _dep.user_id RETURNING balance INTO _new_bal;
    UPDATE public.mpesa_deposits SET
      status='completed', credited=true, completed_at=now(), credited_at=now()
      WHERE id=_deposit_id;
    INSERT INTO public.wallet_ledger (user_id, entry_type, amount_usd, balance_after, reference_type, reference_id, memo)
      VALUES (_dep.user_id, 'mpesa_deposit_manual', _dep.credited_amount_usd, _new_bal,
              'mpesa_deposit', _dep.id, COALESCE(_dep.mpesa_receipt, 'manual verification'));
  ELSE
    UPDATE public.mpesa_deposits SET
      status='rejected', failure_reason=COALESCE(_reason, 'Manual verification rejected')
      WHERE id=_deposit_id;
  END IF;
END; $$;
