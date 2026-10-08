"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logoutUser } from "@/app/actions/auth";
import {
  PlusCircle,
  ExternalLink,
  LogOut,
  ChevronRight,
  FileText,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/components/ui/utils";
import { useAuth } from "@/components/providers/AuthProvider";

export function HostSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { user, role } = useAuth();
  const isCollapsed = state === "collapsed";

  const userRole = role || user?.user_metadata?.role || "student";
  const isStudent = userRole !== "host" && userRole !== "admin";

  const navItems = isStudent
    ? [
      {
        label: "My Exams",
        href: "/host/candidates",
        icon: FileText,
        exact: false,
      },
    ]
    : [
      {
        label: "Host Exam",
        href: "/host/create",
        icon: PlusCircle,
        exact: false,
      },
    ];

  const handleLogout = async () => {
    await logoutUser();
  };

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-[var(--border)] bg-[var(--sidebar)]">
      {/* ── Header ── */}
      <SidebarHeader className="border-b border-[var(--sidebar-border)] px-4 py-4">
        <Link
          href="/host"
          className="flex items-center gap-3 group"
          aria-label="Teso Exam Dashboard"
        >
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0 transition-transform group-hover:scale-105">
            <Image
              src="/teso-logo.png"
              alt="Teso"
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-[var(--sidebar-foreground)] leading-none whitespace-nowrap">
                Teso Exams
              </p>

            </div>
          )}
        </Link>
      </SidebarHeader>

      {/* ── Main Nav ── */}
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--foreground-subtle)] px-3 mb-1">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href, item.exact);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        "h-10 rounded-xl transition-all duration-200",
                        active
                          ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100"
                          : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-3 px-3">
                        <Icon
                          className={cn(
                            "w-4.5 h-4.5 flex-shrink-0",
                            active ? "text-indigo-500" : ""
                          )}
                        />
                        <span className="font-medium text-sm">{item.label}</span>
                        {active && (
                          <ChevronRight className="ml-auto w-3.5 h-3.5 text-indigo-400 opacity-60" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-2 bg-[var(--sidebar-border)]" />

        {/* External */}
        {isStudent && (
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--foreground-subtle)] px-3 mb-1">
                Platform
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Study Platform"
                    className="h-10 rounded-xl text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] transition-all duration-200"
                  >
                    <Link
                      href={process.env.NEXT_PUBLIC_STUDY_PLATFORM_URL || "http://localhost:3000/plan"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3"
                    >
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium text-sm">Study Platform</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="border-t border-[var(--sidebar-border)] p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Log out"
              className="h-9 rounded-xl text-[var(--foreground-muted)] hover:bg-red-50 hover:text-red-500 hover:border-red-100 border border-transparent transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium text-sm">Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
