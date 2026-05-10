import { ReactNode, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useNickname";
import NicknameSetup from "@/components/social/NicknameSetup";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { profile, loading: profLoading, refresh } = useMyProfile();
  const location = useLocation();
  const [open, setOpen] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 닉네임 없는 사용자: 강제 모달
  if (!profLoading && !profile) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-sm text-muted-foreground">닉네임을 먼저 설정해주세요</div>
        </div>
        <NicknameSetup
          open={open}
          forced
          onSaved={() => { setOpen(false); refresh(); }}
        />
      </>
    );
  }

  return <>{children}</>;
}
