"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { IssueTypeIcon } from "@/components/issues/issue-type-icon";
import { PriorityIcon } from "@/components/issues/priority-icon";
import { createIssue, deleteIssue, updateIssue } from "@/actions/issue";
import { toPersianDigits } from "@/lib/jalali";
import { cn } from "@/lib/utils";

type EpicIssue = {
  id: string;
  key: string;
  title: string;
  type: "EPIC" | "STORY" | "TASK" | "BUG" | "SUBTASK";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  statusName: string;
  done: boolean;
  assignee:
    | {
        id: string;
        firstName: string;
        lastName: string;
        avatarColor: string;
        avatarImage?: string | null;
        avatarIcon?: string | null;
      }
    | null;
};

type Epic = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  issues: EpicIssue[];
};

/** deterministic hue per epic key */
function hueOf(key: string): number {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function EpicsView({
  projectId,
  epics,
  canEdit,
}: {
  projectId: string;
  epics: Epic[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Epic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Epic | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <FolderKanban className="size-5 text-violet-500" /> اپیک‌ها
        </h1>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> اپیک جدید
          </Button>
        )}
      </div>

      {epics.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <FolderKanban className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">هنوز اپیکی ساخته نشده است.</p>
        </div>
      )}

      <div className="space-y-3">
        {epics.map((epic) => {
          const done = epic.issues.filter((i) => i.done).length;
          const pct = epic.issues.length > 0 ? Math.round((done / epic.issues.length) * 100) : 0;
          const isOpen = expanded.has(epic.id);
          const hue = hueOf(epic.key);
          return (
            <section key={epic.id} className="rounded-xl border border-border bg-card">
              <header className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `hsl(${hue} 70% 55%)` }}
                  />
                  <button
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(epic.id)) next.delete(epic.id);
                        else next.add(epic.id);
                        return next;
                      })
                    }
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-right"
                  >
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !isOpen && "-rotate-90")} />
                    <span dir="ltr" className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {epic.key}
                    </span>
                    <span className="truncate font-semibold hover:text-primary">{epic.title}</span>
                  </button>
                  <Badge variant={pct === 100 && epic.issues.length > 0 ? "success" : "outline"}>
                    {toPersianDigits(done)}/{toPersianDigits(epic.issues.length)}
                  </Badge>
                  {canEdit && (
                    <>
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditTarget(epic)} aria-label="ویرایش اپیک">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(epic)} aria-label="حذف اپیک">
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </div>
                {epic.description && (
                  <p className="mt-1.5 line-clamp-2 pr-6 text-xs text-muted-foreground">{epic.description}</p>
                )}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: `hsl(${hue} 70% 55%)` }}
                  />
                </div>
              </header>

              {isOpen && (
                <ul className="divide-y divide-border border-t border-border">
                  {epic.issues.length === 0 && (
                    <li className="px-4 py-3 text-center text-xs text-muted-foreground">
                      وظیفه‌ای به این اپیک متصل نیست.
                    </li>
                  )}
                  {epic.issues.map((issue) => (
                    <li key={issue.id}>
                      <button
                        onClick={() => router.push(`/issue/${issue.key}`)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-secondary/50"
                      >
                        <IssueTypeIcon type={issue.type} />
                        <span dir="ltr" className="font-mono text-[11px] text-muted-foreground">{issue.key}</span>
                        <span className={cn("truncate", issue.done && "text-muted-foreground line-through")}>
                          {issue.title}
                        </span>
                        <span className="mr-auto flex shrink-0 items-center gap-2">
                          <Badge variant={issue.done ? "success" : "outline"}>{issue.statusName}</Badge>
                          <PriorityIcon priority={issue.priority} />
                          {issue.assignee ? (
                            <Avatar
                              firstName={issue.assignee.firstName}
                              lastName={issue.assignee.lastName}
                              color={issue.assignee.avatarColor}
                              imageUrl={issue.assignee.avatarImage}
                              icon={issue.assignee.avatarIcon}
                              size="xs"
                            />
                          ) : (
                            <span className="size-5 rounded-full border border-dashed border-input" />
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Create dialog */}
      <EpicFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="اپیک جدید"
        onSubmit={async ({ title, description }) => {
          const res = await createIssue({
            projectId,
            title,
            description: description || undefined,
            type: "EPIC",
          });
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          toast.success("اپیک ایجاد شد");
          refresh();
          return true;
        }}
      />

      {/* Edit dialog */}
      <EpicFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="ویرایش اپیک"
        initial={{ title: editTarget?.title ?? "", description: editTarget?.description ?? "" }}
        onSubmit={async ({ title, description }) => {
          if (!editTarget) return false;
          const res = await updateIssue({
            id: editTarget.id,
            title,
            ...(description ? { description } : {}),
          });
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          refresh();
          return true;
        }}
      />

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف اپیک</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            با حذف «{deleteTarget?.title}»، وظایف متصل به آن حذف نمی‌شوند و فقط بی‌اپیک می‌شوند.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>انصراف</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTarget) return;
                const res = await deleteIssue(deleteTarget.id);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("اپیک حذف شد");
                setDeleteTarget(null);
                refresh();
              }}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EpicFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: { title: string; description: string };
  onSubmit: (data: { title: string; description: string }) => Promise<boolean>;
}) {
  const [t, setT] = useState("");
  const [d, setD] = useState("");
  const [pending, setPending] = useState(false);

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setT(initial?.title ?? "");
    setD(initial?.description ?? "");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              const ok = await onSubmit({ title: t, description: d });
              if (ok) onOpenChange(false);
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="epic-title">عنوان</Label>
            <Input id="epic-title" value={t} onChange={(e) => setT(e.target.value)} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="epic-desc">توضیحات (اختیاری)</Label>
            <Textarea id="epic-desc" value={d} onChange={(e) => setD(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={pending || !t.trim()}>
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
