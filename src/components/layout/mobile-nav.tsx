"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, FolderKanban, LayoutDashboard, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/projects", label: "پروژه‌ها", icon: FolderKanban },
  { href: "/my-work", label: "کارهای من", icon: ClipboardList },
  { href: "/calendar", label: "تقویم", icon: CalendarDays },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-background/95 backdrop-blur lg:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Menu className="size-5" />
            بیشتر
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="mb-2">
          <DropdownMenuItem asChild>
            <Link href="/reports">گزارش‌ها</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/teams">تیم‌ها</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/notifications">اعلان‌ها</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">تنظیمات</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
