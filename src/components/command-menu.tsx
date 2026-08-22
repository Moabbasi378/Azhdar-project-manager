"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  FolderKanban,
  Layers,
  LineChart,
  ClipboardList,
  LayoutDashboard,
  Plus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { IssueTypeIcon } from "@/components/issues/issue-type-icon";
import { Avatar } from "@/components/ui/avatar";
import { SPRINT_STATE_LABELS } from "@/lib/utils";
import { useShell } from "@/components/layout/app-shell";

type SearchResults = {
  issues: {
    key: string;
    title: string;
    type: "EPIC" | "STORY" | "TASK" | "BUG" | "SUBTASK";
    project: { key: string; name: string; icon: string };
  }[];
  projects: { key: string; name: string; icon: string }[];
  users: {
    id: string;
    firstName: string;
    lastName: string;
    avatarColor: string;
    avatarImage?: string | null;
    avatarIcon?: string | null;
    email: string;
  }[];
  sprints: { id: string; name: string; state: keyof typeof SPRINT_STATE_LABELS; project: { name: string; key: string } }[];
};

const STATIC_ACTIONS = [
  { label: "داشبورد", icon: LayoutDashboard, href: "/dashboard", shortcut: "G D" },
  { label: "کارهای من", icon: ClipboardList, href: "/my-work", shortcut: "G M" },
  { label: "پروژه‌ها", icon: FolderKanban, href: "/projects", shortcut: "G P" },
  { label: "گزارش‌ها", icon: LineChart, href: "/reports", shortcut: "G R" },
  { label: "تقویم", icon: CalendarDays, href: "/calendar", shortcut: "G C" },
];

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { openQuickCreate, projects } = useShell();
  const [q, setQ] = useState("");

  const { data } = useQuery<SearchResults>({
    queryKey: ["search", q],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("خطا در جستجو");
      return res.json();
    },
    enabled: open,
    staleTime: 10_000,
  });

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function handleOpenChange(next: boolean) {
    if (!next) setQ("");
    onOpenChange(next);
  }

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput value={q} onValueChange={setQ} placeholder="جستجوی وظیفه، پروژه، کاربر…" />
      <CommandList>
        <CommandEmpty>نتیجه‌ای یافت نشد</CommandEmpty>

        <CommandGroup heading="اقدامات">
          <CommandItem onSelect={() => { onOpenChange(false); openQuickCreate(); }}>
            <Plus /> ایجاد وظیفه جدید
            <kbd dir="ltr" className="mr-auto font-mono text-[10px] text-muted-foreground">C</kbd>
          </CommandItem>
        </CommandGroup>

        {(data?.issues.length ?? 0) > 0 && (
          <CommandGroup heading="وظایف">
            {data!.issues.map((issue) => (
              <CommandItem key={issue.key} value={issue.key} onSelect={() => go(`/issue/${issue.key}`)}>
                <IssueTypeIcon type={issue.type} />
                <span dir="ltr" className="font-mono text-xs text-muted-foreground">{issue.key}</span>
                <span className="truncate">{issue.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(data?.projects.length ?? 0) > 0 && (
          <CommandGroup heading="پروژه‌ها">
            {data!.projects.map((p) => (
              <CommandItem key={p.key} value={p.key} onSelect={() => go(`/projects/${p.key}/board`)}>
                <span>{p.icon}</span>
                {p.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(data?.sprints.length ?? 0) > 0 && (
          <CommandGroup heading="اسپرینت‌ها">
            {data!.sprints.map((s) => (
              <CommandItem
                key={s.id}
                value={s.id}
                onSelect={() => go(`/projects/${s.project.key}/sprints`)}
              >
                <Layers />
                <span>{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  · {s.project.name} · {SPRINT_STATE_LABELS[s.state]}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(data?.users.length ?? 0) > 0 && (
          <CommandGroup heading="کاربران">
            {data!.users.map((u) => (
              <CommandItem key={u.id} value={u.id} onSelect={() => go(`/teams`)}>
                <Avatar
                  firstName={u.firstName}
                  lastName={u.lastName}
                  color={u.avatarColor}
                  imageUrl={u.avatarImage}
                  icon={u.avatarIcon}
                  size="sm"
                />
                {u.firstName} {u.lastName}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {q.trim() === "" && (
          <>
            <CommandGroup heading="پروژه‌های شما">
              {projects.map((p) => (
                <CommandItem key={p.key} value={`proj-${p.key}`} onSelect={() => go(`/projects/${p.key}/board`)}>
                  <span>{p.icon}</span>
                  {p.name}
                  <span dir="ltr" className="mr-auto font-mono text-[10px] text-muted-foreground">{p.key}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="پیمایش">
              {STATIC_ACTIONS.map((a) => (
                <CommandItem key={a.href} value={`nav-${a.href}`} onSelect={() => go(a.href)}>
                  <a.icon />
                  {a.label}
                  <kbd dir="ltr" className="mr-auto font-mono text-[10px] text-muted-foreground">{a.shortcut}</kbd>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
