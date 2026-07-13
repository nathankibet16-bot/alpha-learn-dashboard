import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) navigate({ to: "/login", replace: true });
      else if (!user.email_confirmed_at) navigate({ to: "/verify", replace: true });
      else navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);
  return <div className="min-h-screen bg-zinc-950" />;
}
