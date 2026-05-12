import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  nickname: string | null;
  is_admin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  api_connected: boolean;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) setError(error.message);
    else setUsers((data as AdminUserRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setAdmin = useCallback(async (userId: string, isAdmin: boolean) => {
    const { error } = await supabase.rpc("set_user_admin", {
      p_target_user_id: userId, p_is_admin: isAdmin,
    });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  return { users, loading, error, refresh, setAdmin };
}
