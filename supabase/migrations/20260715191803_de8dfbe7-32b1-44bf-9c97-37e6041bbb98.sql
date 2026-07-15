ALTER TABLE public.profiles ALTER COLUMN balance SET DEFAULT 0;
UPDATE public.profiles p SET balance = 0
WHERE balance = 10000
  AND trade_count = 0
  AND NOT EXISTS (SELECT 1 FROM public.deposits d WHERE d.user_id = p.id AND d.status = 'approved')
  AND NOT EXISTS (SELECT 1 FROM public.withdrawals w WHERE w.user_id = p.id);