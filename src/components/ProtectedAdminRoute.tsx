import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type AuthState = "checking" | "allowed" | "denied";

export default function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setState("denied");
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      setState(roles?.some((r) => r.role === "admin") ? "allowed" : "denied");
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === "checking") {
    // Render nothing during the server validation to avoid exposing any
    // admin UI before the role check resolves.
    return null;
  }
  if (state === "denied") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}