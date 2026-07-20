
-- ==========================================================================
-- Bot Sessions: full lifecycle + atomic settlement + wallet ledger integration
-- ==========================================================================

CREATE TABLE public.bot_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running',
  stake_amount numeric(14,2) NOT NULL,
  realized_pnl numeric(14,2) NOT NULL DEFAULT 0,
  trade_count integer NOT NULL DEFAULT 0,
  loss_count integer NOT NULL DEFAULT 0,
  max_profit_cap numeric(14,2) NOT NULL,
  max_loss_cap numeric(14,2) NOT NULL,
  net_result numeric(14,2),
  balance_before numeric(14,2),
  balance_after numeric(14,2),
  ledger_id uuid,
  failure_reason text,
  last_tick_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bot_sessions_status_chk CHECK (status IN
    ('created','starting','running','stopping','settling','completed','stopped','failed'))
);
CREATE INDEX bot_sessions_user_idx ON public.bot_sessions(user_id, created_at DESC);
CREATE INDEX bot_sessions_active_idx ON public.bot_sessions(status) WHERE status IN ('running','stopping','settling');

GRANT SELECT, INSERT, UPDATE ON public.bot_sessions TO authenticated;
GRANT ALL ON public.bot_sessions TO service_role;
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sessions" ON public.bot_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Writes go through RPCs only; block direct inserts/updates from clients.
CREATE POLICY "No direct writes" ON public.bot_sessions
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

CREATE TRIGGER bot_sessions_updated BEFORE UPDATE ON public.bot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trade rows for the session (server-generated, append-only)
CREATE TABLE public.bot_trades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.bot_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  asset text NOT NULL,
  action text NOT NULL,
  entry_price numeric(18,6) NOT NULL,
  exit_price numeric(18,6) NOT NULL,
  profit_usd numeric(14,2) NOT NULL,
  is_win boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bot_trades_session_idx ON public.bot_trades(session_id, created_at);
GRANT SELECT ON public.bot_trades TO authenticated;
GRANT ALL ON public.bot_trades TO service_role;
ALTER TABLE public.bot_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own trades" ON public.bot_trades
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ==========================================================================
-- start_bot_session: validate stake ≤ balance, create running session
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.start_bot_session(_stake numeric)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _bal numeric; _sid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _stake IS NULL OR _stake <= 0 THEN RAISE EXCEPTION 'Invalid stake'; END IF;

  SELECT balance INTO _bal FROM public.profiles WHERE id = _uid;
  IF _bal IS NULL OR _bal < _stake THEN RAISE EXCEPTION 'Stake exceeds balance'; END IF;

  -- Auto-fail any stragglers before starting a new one
  UPDATE public.bot_sessions
    SET status = 'failed', failure_reason = 'superseded', settled_at = now()
    WHERE user_id = _uid AND status IN ('running','stopping','settling');

  INSERT INTO public.bot_sessions
    (user_id, status, stake_amount, max_profit_cap, max_loss_cap, balance_before, last_tick_at)
  VALUES
    (_uid, 'running', _stake, round(_stake * 0.40, 2), round(_stake * 0.30, 2), _bal, now())
  RETURNING id INTO _sid;

  RETURN _sid;
END; $$;

-- ==========================================================================
-- record_bot_trade: append a server-generated trade + update running pnl
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.record_bot_trade(
  _session_id uuid, _asset text, _action text,
  _entry numeric, _exit numeric, _profit numeric, _is_win boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _s public.bot_sessions%ROWTYPE; _new_pnl numeric; _applied numeric := _profit;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _s FROM public.bot_sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND OR _s.user_id <> _uid THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF _s.status <> 'running' THEN RAISE EXCEPTION 'Session not running'; END IF;

  -- Enforce caps
  _new_pnl := _s.realized_pnl + _applied;
  IF _new_pnl > _s.max_profit_cap THEN
    _applied := _s.max_profit_cap - _s.realized_pnl;
    _new_pnl := _s.max_profit_cap;
  ELSIF _new_pnl < -_s.max_loss_cap THEN
    _applied := -_s.max_loss_cap - _s.realized_pnl;
    _new_pnl := -_s.max_loss_cap;
  END IF;

  INSERT INTO public.bot_trades (session_id, user_id, asset, action, entry_price, exit_price, profit_usd, is_win)
    VALUES (_session_id, _uid, _asset, _action, _entry, _exit, _applied, _is_win);

  UPDATE public.bot_sessions SET
    realized_pnl = _new_pnl,
    trade_count = trade_count + 1,
    loss_count = loss_count + CASE WHEN _is_win THEN 0 ELSE 1 END,
    last_tick_at = now()
  WHERE id = _session_id;

  RETURN jsonb_build_object('applied', _applied, 'realized_pnl', _new_pnl,
                            'capped', _applied <> _profit);
END; $$;

-- ==========================================================================
-- settle_bot_session: atomically apply realized_pnl to balance, ledger it,
-- mark completed. Idempotent — safe to call twice.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.settle_bot_session(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _s public.bot_sessions%ROWTYPE;
        _bal_before numeric; _bal_after numeric; _applied numeric; _ledger_id uuid;
        _entry_type text; _is_admin_call boolean := false;
BEGIN
  SELECT * INTO _s FROM public.bot_sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;

  IF _uid IS NULL OR _s.user_id <> _uid THEN
    IF _uid IS NOT NULL AND public.has_role(_uid, 'admin') THEN
      _is_admin_call := true;
    ELSE
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  -- Idempotent short-circuit
  IF _s.status IN ('completed','stopped') AND _s.ledger_id IS NOT NULL THEN
    RETURN jsonb_build_object('already_settled', true, 'net_result', _s.net_result,
                              'balance_after', _s.balance_after, 'session_id', _s.id);
  END IF;

  UPDATE public.bot_sessions SET status = 'settling' WHERE id = _session_id;

  SELECT balance INTO _bal_before FROM public.profiles WHERE id = _s.user_id FOR UPDATE;

  _applied := _s.realized_pnl;
  -- Never allow loss to push balance below zero
  IF _bal_before + _applied < 0 THEN _applied := -_bal_before; END IF;
  _bal_after := _bal_before + _applied;

  UPDATE public.profiles SET balance = _bal_after WHERE id = _s.user_id;

  _entry_type := CASE
    WHEN _applied > 0 THEN 'bot_session_profit'
    WHEN _applied < 0 THEN 'bot_session_loss'
    ELSE 'bot_session_adjustment' END;

  INSERT INTO public.wallet_ledger
    (user_id, entry_type, amount_usd, balance_after, reference_type, reference_id, memo)
  VALUES
    (_s.user_id, _entry_type, _applied, _bal_after, 'bot_session', _s.id,
     format('Session %s settled: %s trades, net %s', _s.id, _s.trade_count, _applied))
  RETURNING id INTO _ledger_id;

  UPDATE public.bot_sessions SET
    status = 'completed',
    net_result = _applied,
    balance_after = _bal_after,
    ledger_id = _ledger_id,
    settled_at = now()
  WHERE id = _session_id;

  RETURN jsonb_build_object(
    'session_id', _s.id, 'net_result', _applied, 'balance_before', _bal_before,
    'balance_after', _bal_after, 'ledger_id', _ledger_id,
    'trade_count', _s.trade_count, 'loss_count', _s.loss_count,
    'already_settled', false);
END; $$;

-- ==========================================================================
-- recover_stuck_bot_sessions: cron target
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.recover_stuck_bot_sessions(_older_than_seconds int DEFAULT 180)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cnt int := 0; _s public.bot_sessions%ROWTYPE;
BEGIN
  FOR _s IN
    SELECT * FROM public.bot_sessions
    WHERE status IN ('running','stopping','settling')
      AND COALESCE(last_tick_at, started_at) < now() - make_interval(secs => _older_than_seconds)
    ORDER BY started_at
    LIMIT 100
  LOOP
    BEGIN
      PERFORM public.settle_bot_session(_s.id);
      _cnt := _cnt + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.bot_sessions
        SET status = 'failed', failure_reason = SQLERRM, settled_at = now()
        WHERE id = _s.id;
    END;
  END LOOP;
  RETURN _cnt;
END; $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_sessions;
