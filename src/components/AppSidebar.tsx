import { LayoutDashboard, Database, GitBranch, User, Users, Inbox } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin, hasMasterDataAccess } = useUserRole();

  const mainItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true },
    { title: "Master Data", url: "/master-data", icon: Database, show: isAdmin || hasMasterDataAccess },
    { title: "Klasterisasi", url: "/clustering", icon: GitBranch, show: true },
    { title: "Profil", url: "/profile", icon: User, show: true },
  ].filter((i) => i.show);

  const adminItems = [
    { title: "Kelola Guru", url: "/admin/guru", icon: Users },
    { title: "Permintaan Akses", url: "/admin/requests", icon: Inbox },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-6">
          {!collapsed ? (
            <h1 className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">
              K-Means<br />
              <span className="text-xs font-normal text-sidebar-foreground/70">Klasterisasi Siswa</span>
            </h1>
          ) : (
            <span className="text-xl font-bold text-sidebar-primary-foreground">K</span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
