"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const active =
          link.href === pathname ||
          (link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-nav-link${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
