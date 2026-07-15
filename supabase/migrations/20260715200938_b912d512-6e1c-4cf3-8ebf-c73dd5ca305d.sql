
DROP POLICY IF EXISTS "Users mark own deposit awaiting" ON public.deposits;
CREATE POLICY "Users mark own deposit awaiting" ON public.deposits
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'awaiting_confirmation');

CREATE OR REPLACE FUNCTION public.admin_approve_deposit(_deposit_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _dep public.deposits%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO _dep FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF _dep.status NOT IN ('pending', 'awaiting_confirmation') THEN
    RAISE EXCEPTION 'Deposit already processed';
  END IF;

  UPDATE public.profiles SET balance = balance + _dep.amount WHERE id = _dep.user_id;
  UPDATE public.deposits
    SET status = 'approved', processed_at = now(), processed_by = auth.uid()
    WHERE id = _deposit_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_deposit(_deposit_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.deposits
    SET status = 'rejected', processed_at = now(), processed_by = auth.uid()
    WHERE id = _deposit_id AND status IN ('pending', 'awaiting_confirmation');
END;
$function$;
