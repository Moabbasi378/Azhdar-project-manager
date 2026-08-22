"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShellProject } from "@/components/layout/app-shell";
import { useShell } from "@/components/layout/app-shell";

const NAV_ITEMS = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard, shortcut: "G D" },
  { href: "/my-work", label: "کارهای من", icon: ClipboardList, shortcut: "G M" },
  { href: "/projects", label: "پروژه‌ها", icon: FolderKanban, shortcut: "G P" },
  { href: "/calendar", label: "تقویم", icon: CalendarDays, shortcut: "G C" },
  { href: "/reports", label: "گزارش‌ها", icon: LineChart, shortcut: "G R" },
];

const BOTTOM_ITEMS = [
  { href: "/teams", label: "تیم‌ها", icon: Users },
  { href: "/settings", label: "تنظیمات", icon: Settings },
];

export function Sidebar({ projects }: { projects: ShellProject[] }) {
  const pathname = usePathname();
  const { user } = useShell();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-full w-60 flex-col border-l border-border bg-sidebar">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-4 py-4 text-foreground hover:opacity-80"
      >
        <Image
          src="/logo.png"
          alt="اژدر"
          width={28}
          height={28}
          className="size-7 rounded-lg object-cover"
        />
        <span className="text-sm font-bold">اژدر</span>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              isActive(item.href)
                ? "bg-secondary text-foreground"
                : "text-sidebar-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0 opacity-80" />
            {item.label}
          </Link>
        ))}

        {(user.role === "OWNER" || user.role === "PROJECT_MANAGER") && (
          <Link
            href="/teams"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              isActive("/teams")
                ? "bg-secondary text-foreground"
                : "text-sidebar-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Users className="size-4 shrink-0 opacity-80" />
            تیم‌ها
          </Link>
        )}

        {user.role === "OWNER" && (
          <Link
            href="/users"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              isActive("/users")
                ? "bg-secondary text-foreground"
                : "text-sidebar-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Users className="size-4 shrink-0 opacity-80" />
            کاربران
          </Link>
        )}

        <div className="mt-5 mb-1 flex items-center justify-between px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            پروژه‌ها
          </span>
        </div>
        {projects.length === 0 && (
          <p className="px-3 py-1 text-xs text-muted-foreground">هنوز پروژه‌ای ندارید</p>
        )}
        {projects.map((p) => {
          const active = pathname.startsWith(`/projects/${p.key}`);
          return (
            <Link
              key={p.id}
              href={`/projects/${p.key}/board`}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-sidebar-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <span className="text-base leading-none">{p.icon}</span>
              <span className="truncate">{p.name}</span>
              <span dir="ltr" className="mr-auto text-[10px] text-muted-foreground">
                {p.key}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
            isActive("/settings")
              ? "bg-secondary text-foreground"
              : "text-sidebar-foreground hover:bg-secondary/60 hover:text-foreground",
          )}
        >
          <Settings className="size-4 shrink-0 opacity-80" />
          تنظیمات
        </Link>
      </div>
    </div>
  );
}

export { NAV_ITEMS, BOTTOM_ITEMS };
