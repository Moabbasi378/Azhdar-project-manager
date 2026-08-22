"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookmarkPlus, RotateCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteSavedFilter, saveFilter } from "@/actions/filter";
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/utils";

export type IssueFilters = {
  q: string;
  type: string;
  statusId: string;
  assigneeId: string;
  priority: string;
  epicId: string;
  sprintId: string;
};

const EMPTY: IssueFilters = {
  q: "", type: "", statusId: "", assigneeId: "", priority: "", epicId: "", sprintId: "",
};

export function IssuesFilterBar({
  projectKey,
  filters,
  statuses,
  members,
  epics,
  sprints,
  savedFilters,
  projectId,
}: {
  projectKey: string;
  filters: IssueFilters;
  statuses: { id: string; name: string }[];
  members: { id: string; firstName: string; lastName: string }[];
  epics: { id: string; key: string; title: string }[];
  sprints: { id: string; name: string; state: string }[];
  savedFilters: { id: string; name: string; filters: Record<string, string> }[];
  projectId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);
  const [saveOpen, setSaveOpen] = useState(false);
  const [filterName, setFilterName] = useState("");

  function apply(next: Partial<IssueFilters>) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    startTransition(() => {
      router.replace(`/projects/${projectKey}/issues?${params.toString()}`);
    });
  }

  function applySaved(saved: Record<string, string>) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(saved)) {
      if (v) params.set(k, v);
    }
    startTransition(() => {
      router.replace(`/projects/${projectKey}/issues?${params.toString()}`);
    });
  }

  const hasActive = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative min-w-48 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            apply({ q });
          }}
        >
          <Search className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در عنوان یا کلید…"
            className="pr-8"
          />
        </form>

        <Select value={filters.type || "_"} onValueChange={(v) => apply({ type: v === "_" ? "" : v })}>
          <SelectTrigger className="w-28"><SelectValue placeholder="نوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_">همه انواع</SelectItem>
            {Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.statusId || "_"} onValueChange={(v) => apply({ statusId: v === "_" ? "" : v })}>
          <SelectTrigger className="w-32"><SelectValue placeholder="وضعیت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_">همه وضعیت‌ها</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.assigneeId || "_"}
          onValueChange={(v) => apply({ assigneeId: v === "_" ? "" : v })}
        >
          <SelectTrigger className="w-32"><SelectValue placeholder="مسئول" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_">همه اعضا</SelectItem>
            <SelectItem value="unassigned">بدون مسئول</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.priority || "_"} onValueChange={(v) => apply({ priority: v === "_" ? "" : v })}>
          <SelectTrigger className="w-28"><SelectValue placeholder="اولویت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_">همه اولویت‌ها</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.epicId || "_"} onValueChange={(v) => apply({ epicId: v === "_" ? "" : v })}>
          <SelectTrigger className="w-32"><SelectValue placeholder="اپیک" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_">همه اپیک‌ها</SelectItem>
            {epics.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sprintId || "_"} onValueChange={(v) => apply({ sprintId: v === "_" ? "" : v })}>
          <SelectTrigger className="w-36"><SelectValue placeholder="اسپرینت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_">همه اسپرینت‌ها</SelectItem>
            <SelectItem value="backlog">بک‌لاگ</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActive && (
          <Button variant="ghost" size="icon" onClick={() => apply(EMPTY)} aria-label="پاک کردن فیلترها">
            <RotateCcw />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)}>
          <BookmarkPlus /> ذخیره فیلتر
        </Button>
      </div>

      {savedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">فیلترهای ذخیره‌شده:</span>
          {savedFilters.map((f) => (
            <span
              key={f.id}
              className="group inline-flex items-center gap-1 rounded-full border border-border bg-card py-0.5 pe-1 ps-2.5 text-xs"
            >
              <button onClick={() => applySaved(f.filters)} className="hover:text-primary">
                {f.name}
              </button>
              <button
                aria-label={`حذف ${f.name}`}
                onClick={async () => {
                  const res = await deleteSavedFilter(f.id);
                  if (!res.ok) toast.error(res.error);
                  else router.refresh();
                }}
                className="rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>ذخیره فیلتر فعلی</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="filter-name">نام فیلتر</Label>
            <Input
              id="filter-name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              maxLength={60}
              placeholder="مثلاً باگ‌های من"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>انصراف</Button>
            <Button
              disabled={!filterName.trim()}
              onClick={async () => {
                const activeFilters = Object.fromEntries(
                  Object.entries(filters).filter(([, v]) => v),
                );
                const res = await saveFilter({
                  name: filterName.trim(),
                  projectId,
                  filters: activeFilters,
                });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("فیلتر ذخیره شد");
                setSaveOpen(false);
                setFilterName("");
                router.refresh();
              }}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
