import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { data, isLoading } = useUserProfile();
  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">권한 확인 중...</div>;
  }
  if (!data?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
