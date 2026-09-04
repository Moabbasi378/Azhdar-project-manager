"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  ChartLine,
  Flag,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, Label, Textarea } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createSprint, deleteSprint, startSprint, completeSprint, updateSprint } from "@/actions/sprint";
import { formatJalali, toPersianDigits } from "@/lib/jalali";
import { cn } from "@/lib/utils";

export type SprintRow = {
  id: string;
  name: string;
  goal: string | null;
  state: "PLANNED" | "ACTIVE" | "COMPLETED";
  startDate: string | null;
  endDate: string | null;
  issueCount: number;
  doneCount: number;
  points: number;
};

const STATE_BADGE: Record<SprintRow["state"], { label: string; variant: "success" | "outline" | "default" }> = {
  ACTIVE: { label: "فعال", variant: "success" },
  PLANNED: { label: "برنامه‌ریزی شده", variant: "outline" },
  COMPLETED: { label: "تکمیل شده", variant: "default" },
};

export function SprintsView({
  projectId,
  projectKey,
  initialSprints,
  canManage,
}: {
  projectId: string;
  projectKey: string;
  initialSprints: SprintRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [startTarget, setStartTarget] = useState<SprintRow | null>(null);
  const [completeTarget, setCompleteTarget] = useState<SprintRow | null>(null);
  const [editTarget, setEditTarget] = useState<SprintRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SprintRow | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    const res = await fn();
    if (!res.ok) {
      toast.error(ERRORS[res.error ?? ""] ?? res.error ?? "خطا");
      return false;
    }
    refresh();
    return true;
  }

  const active = initialSprints.filter((s) => s.state === "ACTIVE");
  const planned = initialSprints.filter((s) => s.state === "PLANNED");
  const completed = initialSprints.filter((s) => s.state === "COMPLETED");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">اسپرینت‌ها</h1>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> اسپرینت جدید
          </Button>
        )}
      </div>

      {initialSprints.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Target className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">هنوز اسپرینتی ساخته نشده است.</p>
        </div>
      )}

      {[...active, ...planned, ...completed].map((sprint) => (
        <SprintCard
          key={sprint.id}
          sprint={sprint}
          reportHref={`/projects/${projectKey}/sprints/${sprint.id}`}
          canManage={canManage}
          onStart={() => setStartTarget(sprint)}
          onComplete={() => setCompleteTarget(sprint)}
          onEdit={() => setEditTarget(sprint)}
          onDelete={() => setDeleteTarget(sprint)}
        />
      ))}

      {/* Create dialog */}
      <SprintFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="اسپرینت جدید"
        onSubmit={async (data) => {
          const ok = await run(() => createSprint({ projectId, ...data }));
          if (ok) setCreateOpen(false);
        }}
      />

      {/* Start dialog */}
      <StartSprintDialog
        sprint={startTarget}
        onClose={() => setStartTarget(null)}
        onStart={async (startDate, endDate) => {
          if (!startTarget) return;
          const ok = await run(() =>
            startSprint({ id: startTarget.id, startDate, endDate }),
          );
          if (ok) setStartTarget(null);
        }}
      />

      {/* Complete dialog */}
      <CompleteSprintDialog
        sprint={completeTarget}
        hasNext={planned.length > 0}
        onClose={() => setCompleteTarget(null)}
        onComplete={async (unfinished) => {
          if (!completeTarget) return;
          const ok = await run(() => completeSprint({ id: completeTarget.id, unfinished }));
          if (ok) setCompleteTarget(null);
        }}
      />

      {/* Edit dialog */}
      <SprintFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="ویرایش اسپرینت"
        initial={editTarget ? { name: editTarget.name, goal: editTarget.goal ?? "", startDate: editTarget.startDate, endDate: editTarget.endDate } : undefined}
        onSubmit={async (data) => {
          if (!editTarget) return;
          const ok = await run(() => updateSprint({ id: editTarget.id, ...data }));
          if (ok) setEditTarget(null);
        }}
      />

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف اسپرینت</DialogTitle>
            <DialogDescription>
              آیا از حذف «{deleteTarget?.name}» مطمئن هستید؟ وظایف آن به بک‌لاگ برمی‌گردند.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>انصراف</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTarget) return;
                const ok = await run(() => deleteSprint(deleteTarget.id));
                if (ok) setDeleteTarget(null);
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

const ERRORS: Record<string, string> = {
  ANOTHER_ACTIVE: "در هر زمان فقط یک اسپرینت می‌تواند فعال باشد.",
  NO_NEXT_SPRINT: "اسپرینت برنامه‌ریزی‌شده بعدی وجود ندارد.",
  ACTIVE_SPRINT: "اسپرینت فعال قابل حذف نیست.",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysISO(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function SprintCard({
  sprint,
  reportHref,
  canManage,
  onStart,
  onComplete,
  onEdit,
  onDelete,
}: {
  sprint: SprintRow;
  reportHref: string;
  canManage: boolean;
  onStart: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badge = STATE_BADGE[sprint.state];
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4",
        sprint.state === "ACTIVE" && "border-success/50 ring-1 ring-success/20",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Flag className={cn("size-4", sprint.state === "ACTIVE" ? "text-success" : "text-muted-foreground")} />
        <h3 className="font-semibold">{sprint.name}</h3>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {canManage && sprint.state !== "COMPLETED" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="mr-auto" aria-label="عملیات">
                ⋯
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={reportHref}>
                  <ChartLine /> گزارش کامل اسپرینت
                </Link>
              </DropdownMenuItem>
              {sprint.state === "PLANNED" && (
                <DropdownMenuItem onSelect={onStart}>
                  <Play /> شروع اسپرینت
                </DropdownMenuItem>
              )}
              {sprint.state === "ACTIVE" && (
                <DropdownMenuItem onSelect={onComplete}>
                  <Flag /> تکمیل اسپرینت
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> ویرایش
              </DropdownMenuItem>
              {sprint.state === "PLANNED" && (
                <DropdownMenuItem destructive onSelect={onDelete}>
                  <Trash2 /> حذف
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {sprint.goal && <p className="mt-2 text-sm text-muted-foreground">{sprint.goal}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(sprint.startDate || sprint.endDate) && (
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {sprint.startDate ? formatJalali(new Date(sprint.startDate)) : "—"}
            {" تا "}
            {sprint.endDate ? formatJalali(new Date(sprint.endDate)) : "—"}
          </span>
        )}
        <span>{toPersianDigits(sprint.issueCount)} وظیفه</span>
        <span>{toPersianDigits(sprint.points)} امتیاز</span>
        {sprint.issueCount > 0 && (
          <span>
            {toPersianDigits(Math.round((sprint.doneCount / sprint.issueCount) * 100))}٪ تکمیل
          </span>
        )}
      </div>

      {sprint.issueCount > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${Math.round((sprint.doneCount / sprint.issueCount) * 100)}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href={reportHref}>
            <ChartLine /> گزارش کامل
          </Link>
        </Button>
        {canManage && sprint.state === "PLANNED" && (
          <Button size="sm" onClick={onStart}>
            <Play /> شروع اسپرینت
          </Button>
        )}
        {canManage && sprint.state === "ACTIVE" && (
          <Button size="sm" variant="outline" onClick={onComplete}>
            <Flag /> تکمیل اسپرینت
          </Button>
        )}
      </div>
    </div>
  );
}

function SprintFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: { name: string; goal: string; startDate: string | null; endDate: string | null };
  onSubmit: (data: { name: string; goal?: string; startDate?: Date; endDate?: Date }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? "");
  const [pending, setPending] = useState(false);

  // reset when opening
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setName(initial?.name ?? "");
    setGoal(initial?.goal ?? "");
    setStartDate(initial?.startDate?.slice(0, 10) ?? "");
    setEndDate(initial?.endDate?.slice(0, 10) ?? "");
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
              await onSubmit({
                name,
                goal: goal || undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
              });
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="sprint-name">نام</Label>
            <Input id="sprint-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sprint-goal">هدف اسپرینت (اختیاری)</Label>
            <Textarea id="sprint-goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sprint-start">تاریخ شروع</Label>
              <Input id="sprint-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sprint-end">تاریخ پایان</Label>
              <Input id="sprint-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StartSprintDialog({
  sprint,
  onClose,
  onStart,
}: {
  sprint: SprintRow | null;
  onClose: () => void;
  onStart: (startDate: Date | undefined, endDate: Date | undefined) => Promise<void>;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pending, setPending] = useState(false);

  const [wasId, setWasId] = useState<string | null>(null);
  if (sprint && sprint.id !== wasId) {
    setWasId(sprint.id);
    setStartDate(sprint.startDate?.slice(0, 10) ?? todayISO());
    setEndDate(sprint.endDate?.slice(0, 10) ?? plusDaysISO(14));
  }

  return (
    <Dialog open={!!sprint} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>شروع «{sprint?.name}»</DialogTitle>
          <DialogDescription>
            با شروع اسپرینت، تمام اعضای پروژه مطلع می‌شوند. در هر لحظه فقط یک اسپرینت می‌تواند فعال باشد.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="start-date">تاریخ شروع</Label>
            <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">تاریخ پایان</Label>
            <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onStart(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
              } finally {
                setPending(false);
              }
            }}
          >
            <Play /> شروع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteSprintDialog({
  sprint,
  hasNext,
  onClose,
  onComplete,
}: {
  sprint: SprintRow | null;
  hasNext: boolean;
  onClose: () => void;
  onComplete: (unfinished: "BACKLOG" | "NEXT_SPRINT") => Promise<void>;
}) {
  const [choice, setChoice] = useState<"BACKLOG" | "NEXT_SPRINT">("BACKLOG");
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={!!sprint} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>تکمیل «{sprint?.name}»</DialogTitle>
          <DialogDescription>
            وظایف ناتمام این اسپرینت چه شوند؟
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={choice} onValueChange={(v) => setChoice(v as "BACKLOG" | "NEXT_SPRINT")} className="gap-3">
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary">
            <RadioGroupItem value="BACKLOG" className="mt-0.5" />
            <span>
              بازگشت به بک‌لاگ
              <span className="block text-xs text-muted-foreground">وظایف ناتمام به بک‌لاگ پروژه منتقل می‌شوند.</span>
            </span>
          </label>
          <label className={cn("flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary", !hasNext && "pointer-events-none opacity-50")}>
            <RadioGroupItem value="NEXT_SPRINT" disabled={!hasNext} className="mt-0.5" />
            <span>
              انتقال به اسپرینت بعدی
              <span className="block text-xs text-muted-foreground">
                {hasNext ? "وظایف ناتمام به اسپرینت برنامه‌ریزی‌شده بعدی منتقل می‌شوند." : "اسپرینت برنامه‌ریزی‌شده بعدی وجود ندارد."}
              </span>
            </span>
          </label>
        </RadioGroup>
        <div className="flex items-center gap-1.5 rounded-lg bg-warning/10 p-2.5 text-xs text-warning">
          <TriangleAlert className="size-4 shrink-0" />
          این عمل قابل بازگشت نیست.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onComplete(choice);
              } finally {
                setPending(false);
              }
            }}
          >
            تکمیل اسپرینت
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
