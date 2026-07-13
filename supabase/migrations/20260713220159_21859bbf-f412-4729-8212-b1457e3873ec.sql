
REVOKE ALL ON FUNCTION public.admin_approve_deposit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_deposit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_approve_withdrawal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_withdrawal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_my_trade_count() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_my_trade_count() TO authenticated;
