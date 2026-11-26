"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Users,
  Truck,
  UserCircle,
  Building2,
  FileText,
  Files,
  BarChart3,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { signOut, useSession } from "next-auth/react";
import { InstallAppButton } from "@/components/pwa/install-button";
import { ToggleIcon } from "@/components/watermelon/tallie-dashboard/components/tallie/icons";
import { useTheme } from "@/components/watermelon/tallie-dashboard/components/tallie/theme-provider";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  {
    group: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
      { name: "Rides", href: "/rides", icon: Car, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
    ],
  },
  {
    group: "Fleet",
    items: [
      { name: "Drivers", href: "/drivers", icon: Users, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
      { name: "Vehicles", href: "/vehicles", icon: Truck, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
      { name: "Passengers", href: "/passengers", icon: UserCircle, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
    ],
  },
  {
    group: "Documents",
    items: [
      { name: "Templates", href: "/templates", icon: FileText, roles: ["ADMIN", "MANAGER"] },
      { name: "Documents", href: "/documents", icon: Files, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
      { name: "Reports", href: "/reports", icon: BarChart3, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
    ],
  },
  {
    group: "Admin",
    items: [
      { name: "Companies", href: "/companies", icon: Building2, roles: ["ADMIN", "MANAGER"] },
      { name: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
    ],
  },
];

const menuButtonClassName = cn(
  "h-10 gap-2.5 rounded-lg px-3 text-sm text-sidebar-foreground/70 transition-colors",
  "aria-[current=page]:bg-background aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground aria-[current=page]:shadow-xs",
  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "[&_svg]:size-4!",
  "group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:hidden"
);

const dropdownTriggerClassName =
  "peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-lg p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0";

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isCollapsed = state === "collapsed" && !isMobile;

  const displayName = userName || session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const role = session?.user?.role || "OPERATOR";

  const groups = useMemo(
    () =>
      navigation
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => item.roles.includes(role)),
        }))
        .filter((g) => g.items.length > 0),
    [role]
  );

  return (
    <ShadcnSidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3 group-data-[collapsible=icon]:px-2">
        <Link
          href="/dashboard"
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
          className="flex items-center gap-2.5 overflow-hidden rounded-lg px-1 py-1"
        >
          <img
            src="/logo.png"
            alt="Rihal Next Logo"
            className="h-9 w-9 shrink-0 rounded-full object-contain shadow-xs"
          />
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">
              Rihal Next
            </p>
            <p className="truncate text-[10px] font-medium text-sidebar-muted-foreground leading-tight">
              Smarter Journeys. Seamless Ops.
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="no-scrollbar px-2 py-3">
        {groups.map((group) => (
          <SidebarGroup key={group.group} className="px-1 py-1.5">
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted-foreground">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.name}
                        className={menuButtonClassName}
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => {
                            if (isMobile) setOpenMobile(false);
                          }}
                        >
                          <item.icon />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 gap-1">
        <div className="group-data-[collapsible=icon]:hidden px-1 pb-1">
          <InstallAppButton variant="sidebar" />
        </div>

        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={isDark ? "Light Mode" : "Dark Mode"}
              className={menuButtonClassName}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              <ToggleIcon pressed={isDark} />
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className={cn(dropdownTriggerClassName, menuButtonClassName)}
                aria-label="Account"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="truncate font-medium text-sidebar-foreground">
                  {displayName}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="tallie-dashboard w-56"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="leading-tight">
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    {userEmail ? (
                      <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                    ) : null}
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === "ADMIN" && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <UserIcon />
                      User Management
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          <SidebarMenuItem className="hidden md:block">
            <SidebarMenuButton
              tooltip={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={menuButtonClassName}
              onClick={toggleSidebar}
            >
              {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
              <span>{isCollapsed ? "Expand" : "Collapse"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
