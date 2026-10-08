"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function SidebarNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get("tab") : null;
  const [attemptCount, setAttemptCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/assessments/sessions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.sessions && Array.isArray(data.sessions)) {
          setAttemptCount(data.sessions.length);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {links.map((link) => {
        let active = false;

        if (link.href.includes("?tab=")) {
          const targetTab = link.href.split("?tab=")[1];
          active = (pathname === "/" || pathname === "/dashboard") && currentTab === targetTab;
        } else if (link.href === "/" || link.href === "/dashboard") {
          active = (pathname === "/" || pathname === "/dashboard") && (!currentTab || currentTab === "practice");
        } else {
          active =
            link.href === pathname ||
            (link.href !== "/" && link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));
        }

        let displayLabel = link.label;
        if (link.label === "Attempt History" && attemptCount !== null) {
          displayLabel = `Attempt History (${attemptCount})`;
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-nav-link${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {displayLabel}
          </Link>
        );
      })}
    </>
  );
}
