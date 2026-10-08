"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { logout } from "@teso/auth/actions";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

interface AppNavbarProps {
  userImage?: string | null;
  userName?: string | null;
}

export function AppNavbar({ userImage, userName }: AppNavbarProps = {}) {
  const { user } = useAuth();
  const { t, isSinhala } = useLanguage();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const effectiveAvatar = userImage || user?.photoURL;

  let displayName = userName || user?.displayName || "";
  if (!displayName || displayName.trim() === "undefined undefined") {
    displayName = user?.email?.split('@')[0] || "Guest";
  }
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center justify-end px-4 sm:px-6 py-0 gap-3 bg-white/95 dark:bg-[#0A1120]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 h-16 w-full flex-shrink-0 transition-colors duration-200">

      {/* Language Switcher (EN | සිංහල) */}
      <LanguageToggle />

      {/* Divider */}
      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Divider */}
      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

      {/* User info */}
      <Link href="/profile" className="flex items-center gap-2.5 cursor-pointer group hover:opacity-90 transition-opacity" title="View Profile">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 select-none shadow-xs group-hover:ring-2 group-hover:ring-primary/40 transition-all">
          {effectiveAvatar ? (
            <img
              src={effectiveAvatar}
              alt={displayName}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-[#0070BA] dark:bg-sky-500 text-white flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
          )}
        </div>

        {/* Name + email */}
        <div className="flex flex-col items-start leading-tight hidden sm:flex">
          <span
            className={cn(
              "text-sm font-bold text-foreground max-w-[140px] truncate group-hover:text-primary transition-colors",
              isSinhala && "font-noto-sans-sinhala font-semibold"
            )}
            style={{ fontFamily: !isSinhala ? "'Google Sans', sans-serif" : undefined }}
          >
            {displayName}
          </span>
          {user?.email && (
            <span className="text-xs text-muted-foreground max-w-[140px] truncate hidden md:block">
              {user.email}
            </span>
          )}
        </div>
      </Link>

      {/* Divider */}
      <div className="h-5 w-px bg-border dark:bg-slate-800" />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-sm font-medium px-2.5 py-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
        title={t.nav.logout}
      >
        <LogOut className="w-4 h-4" />
        <span className={cn(
          "hidden sm:inline text-xs font-semibold",
          isSinhala && "font-noto-sans-sinhala font-medium"
        )}>
          {t.nav.logout}
        </span>
      </button>
    </header>
  );
}