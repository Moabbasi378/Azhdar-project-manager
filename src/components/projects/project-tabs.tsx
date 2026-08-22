"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "نمای کلی" },
  { href: "/backlog", label: "بک‌لاگ" },
  { href: "/board", label: "برد" },
  { href: "/sprints", label: "اسپرینت‌ها" },
  { href: "/issues", label: "وظایف" },
  { href: "/epics", label: "اپیک‌ها" },
  { href: "/calendar", label: "تقویم" },
  { href: "/reports", label: "گزارش‌ها" },
  { href: "/team", label: "تیم" },
];

export function ProjectTabs({
  projectKey,
  isAdmin,
}: {
  projectKey: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectKey}`;
  const tabs = [...TABS, ...(isAdmin ? [{ href: "/settings", label: "تنظیمات" }] : [])];

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto pt-3" aria-label="بخش‌های پروژه">
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
