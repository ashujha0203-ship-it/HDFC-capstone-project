import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "user" | null;

export function useUserRole() {
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setUserId(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Use RPC to get user role (security definer function)
        const { data, error } = await supabase.rpc("get_user_role", {
          _user_id: user.id,
        });

        if (error) {
          console.error("Error fetching role:", error);
          // If no role found, default to 'user'
          setRole("user");
        } else {
          setRole(data as AppRole || "user");
        }
      } catch (error) {
        console.error("Error in fetchRole:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = role === "admin";
  const isUser = role === "user";

  return { role, isAdmin, isUser, loading, userId };
}
