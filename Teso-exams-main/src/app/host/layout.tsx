import React from "react";
import { HostSidebar } from "@/components/shared/HostSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <HostSidebar />
      <SidebarInset className="bg-[var(--background)] min-h-screen">
        {/* Top bar with sidebar trigger */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)] px-4 sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm">
          <SidebarTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] -ml-1 h-8 w-8" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-[var(--border)]" />
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-widest">
            Exam Platform
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}