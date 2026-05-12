import { Home, Lightbulb, LineChart, Wallet, Settings, LogOut, Globe, MessageSquare, Shield } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

const groups = [
  {
    label: "TRADING",
    items: [
      { title: "대시보드", url: "/dashboard", icon: Home },
      { title: "매매기록", url: "/trades", icon: LineChart },
      { title: "자산관리", url: "/assets", icon: Wallet },
    ],
  },
  {
    label: "NOTES & COMMUNITY",
    items: [
      { title: "아이디어 노트", url: "/ideas", icon: Lightbulb },
      { title: "공유 노트", url: "/shared", icon: Globe },
      { title: "자유게시판", url: "/board", icon: MessageSquare },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { title: "설정", url: "/settings", icon: Settings },
    ],
  },
] as const;

const adminGroup = {
  label: "ADMIN",
  items: [{ title: "관리자", url: "/admin", icon: Shield }],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const { user, signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const isAdmin = profile?.is_admin === true;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success("로그아웃되었습니다");
    navigate("/login", { replace: true });
  };

  const allGroups = isAdmin ? [...groups, adminGroup] : groups;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
            S
          </div>
          {!collapsed && (
            <div>
              <div className="font-semibold text-sidebar-foreground">STOCK-FLOW</div>
              <div className="text-xs text-muted-foreground">Personal Finance</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {allGroups.map((g) => (
          <SidebarGroup key={g.label} className="mt-2">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 px-3">
                {g.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && user?.email && (
          <div className="px-3 py-1.5 text-xs text-muted-foreground truncate" title={user.email}>
            {isAdmin && <span className="text-primary mr-1">🛡️</span>}{user.email}
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout} className="justify-start gap-2 mx-2 mb-1" title="로그아웃">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>로그아웃</span>}
        </Button>
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          {collapsed ? "v1.1" : "STOCK-FLOW v1.1"}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
