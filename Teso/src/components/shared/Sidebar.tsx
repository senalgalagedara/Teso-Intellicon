"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  Compass,
  BookOpen,
  CheckSquare,
  Calendar,
  FileText,
  BarChart3,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
  ExternalLink,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const googleSans = "'Google Sans', 'Google Sans Text', system-ui, -apple-system, sans-serif";

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { t, isSinhala } = useLanguage();

  const menuItems = [
    { id: 'plan', label: t.nav.understand, icon: ClipboardList, href: '/plan' },
    { id: 'videos', label: t.nav.videos, icon: Compass, href: '/videos' },
    { id: 'study', label: t.nav.revision, icon: BookOpen, href: '/revison' },
    { id: 'todolist', label: t.nav.todo, icon: CheckSquare, href: '/todo' },
    { id: 'timetable', label: t.nav.timetable, icon: Calendar, href: '/timetable' },
    { id: 'exams', label: t.nav.exams, icon: FileText, href: '/exams' },
    { id: 'analyse', label: t.nav.analyse, icon: BarChart3, href: '/analyse' },
    { id: 'profile', label: t.nav.profile, icon: User, href: '/profile' },
  ];

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2.5 rounded-xl bg-white dark:bg-[#0A1120] border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-900 dark:text-white"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5 text-slate-900 dark:text-white" />
      </button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          "flex flex-col h-screen border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out z-50",
          "bg-white dark:bg-[#0A1120] text-slate-900 dark:text-slate-100",
          // Mobile: fixed slide-in
          "fixed inset-y-0 left-0 w-72",
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          // Desktop: relative, collapsible
          "md:relative md:translate-x-0 md:shadow-none",
          isExpanded ? "md:w-64" : "md:w-[72px]",
        )}
      >
        {/* Header / Logo */}
        <div className={cn(
          "flex items-center px-4 border-b border-slate-100 dark:border-slate-800/80 h-16 flex-shrink-0",
          isExpanded ? "gap-3 justify-between" : "justify-center"
        )}>

          {/* Logo — expanded (desktop) or always visible on mobile */}
          <div className={cn(
            "flex items-center gap-2.5 overflow-hidden transition-all duration-300",
            !isExpanded && "md:hidden"
          )}>
            <Image
              src="/icon.png"
              alt="Teso logo"
              width={32}
              height={32}
              className="rounded-xl flex-shrink-0"
            />
            <span
              className="font-bold text-[16px] tracking-tight whitespace-nowrap text-slate-900 dark:text-white"
              style={{ fontFamily: googleSans }}
            >
              Teso
            </span>
          </div>

          {/* Collapsed logo icon (desktop only) */}
          <div className={cn(
            "flex-shrink-0 transition-all",
            isExpanded ? "md:hidden" : "hidden md:flex"
          )}>
            <Image
              src="/icon.png"
              alt="Teso logo"
              width={32}
              height={32}
              className="rounded-xl"
            />
          </div>

          {/* Toggle / close button */}
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsMobileOpen(false);
              } else {
                setIsExpanded(!isExpanded);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <div className="md:hidden">
              <X className="w-4 h-4 text-foreground" />
            </div>
            <div className="hidden md:block">
              {isExpanded ? (
                <ChevronLeft className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              )}
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && item.href.startsWith('/') && pathname?.startsWith(item.href));

            const linkElement = (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3.5 py-2.5 rounded-full transition-all duration-200 w-full relative",
                  isActive
                    ? "bg-sky-50 dark:bg-sky-950/60 text-[#0070BA] dark:text-sky-300 font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-slate-800/60 font-medium",
                  !isExpanded && "md:justify-center md:px-0 md:w-11 md:h-11 md:mx-auto"
                )}
              >
                {/* Icon */}
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105",
                    isActive
                      ? "text-[#0070BA] dark:text-sky-400"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                  strokeWidth={2}
                />

                {/* Label */}
                <span
                  className={cn(
                    "text-sm whitespace-nowrap overflow-hidden transition-all duration-200",
                    "opacity-100 max-w-full",
                    !isExpanded && "md:opacity-0 md:max-w-0 md:invisible",
                    isExpanded && "md:opacity-100 md:max-w-full md:visible",
                    isActive
                      ? "font-bold text-[#0070BA] dark:text-sky-300"
                      : "text-muted-foreground group-hover:text-foreground font-medium",
                    isSinhala && "font-noto-sans-sinhala font-medium"
                  )}
                  style={{ fontFamily: !isSinhala ? googleSans : undefined }}
                >
                  {item.label}
                </span>
              </Link>
            );

            return (
              <Tooltip key={item.id} open={!isExpanded ? undefined : false}>
                <TooltipTrigger asChild>
                  {linkElement}
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className={cn(
                    "hidden md:block font-semibold bg-slate-900 dark:bg-slate-800 text-white border border-slate-800 dark:border-slate-700",
                    isSinhala && "font-noto-sans-sinhala"
                  )}
                >
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom section: Exams Platform & branding */}
        <div className="p-3 border-t border-border dark:border-slate-800/80 flex flex-col gap-2">
          {(() => {
            const examsButton = (
              <a
                href={process.env.NEXT_PUBLIC_EXAM_PLATFORM_URL || 'http://localhost:3001/host'}
                className={cn(
                  "group flex items-center gap-3 px-3.5 py-2.5 rounded-full transition-all duration-200",
                  "text-[#0070BA] dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 dark:border dark:border-sky-900/40 shadow-xs",
                  !isExpanded && "md:justify-center md:px-0 md:w-11 md:h-11 md:mx-auto"
                )}
                title={t.nav.examsPlatform}
              >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0 text-[#0070BA] dark:text-sky-400 transition-transform duration-200 group-hover:scale-105" />
                <span
                  className={cn(
                    "text-xs font-bold whitespace-nowrap overflow-hidden transition-all duration-200",
                    !isExpanded && "md:opacity-0 md:max-w-0 md:invisible",
                    isExpanded && "md:opacity-100 md:max-w-full md:visible",
                    isSinhala && "font-noto-sans-sinhala font-medium"
                  )}
                  style={{ fontFamily: !isSinhala ? googleSans : undefined }}
                >
                  {t.nav.examsPlatform}
                </span>
                <ExternalLink
                  className={cn(
                    "w-3.5 h-3.5 ml-auto text-sky-400 dark:text-sky-500 group-hover:text-[#0070BA] dark:group-hover:text-sky-300 transition-colors flex-shrink-0",
                    !isExpanded && "md:hidden"
                  )}
                />
              </a>
            );

            return (
              <Tooltip open={!isExpanded ? undefined : false}>
                <TooltipTrigger asChild>
                  {examsButton}
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className={cn(
                    "hidden md:block font-semibold bg-slate-900 dark:bg-slate-800 text-white",
                    isSinhala && "font-noto-sans-sinhala"
                  )}
                >
                  {t.nav.examsPlatform}
                </TooltipContent>
              </Tooltip>
            );
          })()}

          {/* Bottom branding strip */}
          <div className={cn(
            "pt-1 flex items-center justify-between px-1 select-none",
            !isExpanded && "md:hidden"
          )}>
            <p
              className={cn(
                "text-[10px] tracking-widest uppercase font-semibold text-muted-foreground",
                isSinhala && "font-noto-sans-sinhala font-medium"
              )}
              style={{ fontFamily: !isSinhala ? googleSans : undefined }}
            >
              {t.nav.tesoEducation}
            </p>
            <div
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"
              title="Connected"
            />
          </div>
        </div>
      </div>
    </>
  );
}