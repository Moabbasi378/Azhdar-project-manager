"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Monitor, Moon, Plus, Search, Settings, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/lib/utils";
import { useShell } from "@/components/layout/app-shell";

export type HeaderUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: keyof typeof ROLE_LABELS;
  avatarColor: string;
  avatarImage?: string | null;
  avatarIcon?: string | null;
};

export function Header({ user, unreadCount }: { user: HeaderUser; unreadCount: number }) {
  const { openCommandMenu, openQuickCreate, openShortcuts } = useShell();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-13 shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2">
      {/* Mobile logo */}
      <Link href="/dashboard" className="flex items-center gap-1.5 lg:hidden">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Search className="hidden size-4" />
          <span className="text-xs font-bold">اژ</span>
        </span>
      </Link>

      <button
        onClick={openCommandMenu}
        className="ml-auto hidden h-8 w-64 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 sm:flex md:w-80"
      >
        <Search className="size-4" />
        <span>جستجو…</span>
        <kbd dir="ltr" className="mr-auto rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
          Ctrl K
        </kbd>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={openCommandMenu}
        aria-label="جستجو"
      >
        <Search />
      </Button>

      <div className="mr-auto flex items-center gap-0.5 sm:mr-0">
        <Button
          size="icon"
          onClick={() => openQuickCreate()}
          aria-label="ایجاد سریع وظیفه"
          title="ایجاد وظیفه (C)"
        >
          <Plus />
        </Button>

        <Link
          href="/notifications"
          className="relative inline-flex size-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary/60"
          aria-label={`اعلان‌ها${unreadCount ? ` (${unreadCount} خوانده‌نشده)` : ""}`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "+۹" : unreadCount.toLocaleString("fa-IR")}
            </span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="تغییر تم">
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun /> روشن
              {theme === "light" && <span className="mr-auto text-xs text-muted-foreground">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon /> تاریک
              {theme === "dark" && <span className="mr-auto text-xs text-muted-foreground">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor /> سیستم
              {theme === "system" && <span className="mr-auto text-xs text-muted-foreground">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ms-1 rounded-full focus-visible:outline-2 focus-visible:outline-ring"
              aria-label="منوی کاربر"
            >
              <Avatar
                firstName={user.firstName}
                lastName={user.lastName}
                color={user.avatarColor}
                imageUrl={user.avatarImage}
                icon={user.avatarIcon}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuLabel>
              <div className="font-medium text-foreground">{user.fullName}</div>
              <div dir="ltr" className="text-right text-xs font-normal text-muted-foreground">
                {user.email}
              </div>
              <div className="mt-1 text-[11px] font-normal text-primary">
                {ROLE_LABELS[user.role]}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings /> تنظیمات پروفایل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/my-work")}>
              <User /> کارهای من
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openShortcuts()}>
              <Monitor /> میانبرهای صفحه‌کلید
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut /> خروج از حساب
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
