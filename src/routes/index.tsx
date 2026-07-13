import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const u = localStorage.getItem("alphagroup_user");
      throw redirect({ to: u ? "/dashboard" : "/login" });
    }
    throw redirect({ to: "/login" });
  },
});
