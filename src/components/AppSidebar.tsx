import { Home, Lightbulb, LineChart, Wallet, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const items = [
  { title: "대시보드", url: "/dashboard", icon: Home },
  { title: "아이디어 노트", url: "/ideas", icon: Lightbulb },
  { title: "매매기록", url: "/trades", icon: LineChart },
  { title: "자산관리", url: "/assets", icon: Wallet },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
            F
          </div>
          {!collapsed && (
            <div>
              <div className="font-semibold text-sidebar-foreground">FinFlow</div>
              <div className="text-xs text-muted-foreground">Personal Finance</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>메뉴</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2 space-y-2">
          {!collapsed && (
            <div className="px-2 py-1">
              <div className="text-xs text-muted-foreground">로그인됨</div>
              <div className="text-sm text-sidebar-foreground truncate">{user?.email}</div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">로그아웃</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
