
CREATE OR REPLACE FUNCTION public.start_bot_session(_stake numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _bal numeric; _sid uuid; _cap_pct numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _stake IS NULL OR _stake <= 0 THEN RAISE EXCEPTION 'Invalid stake'; END IF;

  SELECT balance INTO _bal FROM public.profiles WHERE id = _uid;
  IF _bal IS NULL OR _bal < _stake THEN RAISE EXCEPTION 'Stake exceeds balance'; END IF;

  UPDATE public.bot_sessions
    SET status = 'failed', failure_reason = 'superseded', settled_at = now()
    WHERE user_id = _uid AND status IN ('running','stopping','settling');

  -- Randomize target payout between 75% and 85% of stake per session.
  _cap_pct := 0.75 + (random() * 0.10);

  INSERT INTO public.bot_sessions
    (user_id, status, stake_amount, max_profit_cap, max_loss_cap, balance_before, last_tick_at)
  VALUES
    (_uid, 'running', _stake, round(_stake * _cap_pct, 2), round(_stake * 0.25, 2), _bal, now())
  RETURNING id INTO _sid;

  RETURN _sid;
END; $function$;
