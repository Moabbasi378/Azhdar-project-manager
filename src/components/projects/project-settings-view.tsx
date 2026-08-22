"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createStatus,
  deleteStatus,
  reorderStatuses,
  updateProject,
} from "@/actions/project";
import { STATUS_CATEGORY_LABELS } from "@/lib/utils";

type Status = {
  id: string;
  name: string;
  category: "TODO" | "IN_PROGRESS" | "DONE";
  isDefault: boolean;
};

const ICONS = ["🚀", "🛒", "💬", "📱", "🎮", "🧩", "📊", "🔧", "🌍", "⚡"];

export function ProjectSettingsView({
  projectId,
  projectKey,
  initial,
  statuses,
}: {
  projectId: string;
  projectKey: string;
  initial: { name: string; description: string; icon: string };
  statuses: Status[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [icon, setIcon] = useState(initial.icon);
  const [saving, setSaving] = useState(false);
  const [statusList, setStatusList] = useState(statuses);
  const [addStatusOpen, setAddStatusOpen] = useState(false);
  const [deleteStatusTarget, setDeleteStatusTarget] = useState<Status | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function saveGeneral() {
    setSaving(true);
    try {
      const res = await updateProject(projectId, { name, description: description || null, icon });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("تغییرات ذخیره شد");
        refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...statusList];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setStatusList(next);
    void reorderStatuses(projectId, next.map((s) => s.id)).then((res) => {
      if (!res.ok) {
        toast.error(res.error);
        setStatusList(statuses);
      } else refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-6">
      <h1 className="text-lg font-bold">تنظیمات پروژه</h1>

      {/* General */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">عمومی</h2>
        <div>
          <Label>آیکون</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`flex size-9 items-center justify-center rounded-lg border text-lg transition-colors ${
                  icon === ic ? "border-primary bg-accent" : "border-border hover:bg-secondary"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proj-name">نام پروژه</Label>
          <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proj-desc">توضیحات</Label>
          <Textarea
            id="proj-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </div>
        <div className="flex items-center gap-2">
          <span dir="ltr" className="rounded bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
            {projectKey}
          </span>
          <span className="text-[11px] text-muted-foreground">کلید پروژه قابل تغییر نیست.</span>
        </div>
        <Button onClick={saveGeneral} disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />} ذخیره تغییرات
        </Button>
      </section>

      {/* Workflow */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">گردش کار (وضعیت‌ها)</h2>
          <Button variant="outline" size="sm" onClick={() => setAddStatusOpen(true)}>
            <Plus /> وضعیت جدید
          </Button>
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {statusList.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 px-3 py-2.5 text-sm">
              <span className="font-medium">{s.name}</span>
              <Badge variant={s.category === "DONE" ? "success" : s.category === "IN_PROGRESS" ? "warning" : "outline"}>
                {STATUS_CATEGORY_LABELS[s.category]}
              </Badge>
              {s.isDefault && <Badge variant="primary">پیش‌فرض</Badge>}
              <span className="mr-auto flex items-center gap-0.5">
                <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="بالا">
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === statusList.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="پایین"
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={statusList.length <= 1}
                  onClick={() => setDeleteStatusTarget(s)}
                  aria-label="حذف وضعیت"
                >
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Add status dialog */}
      <AddStatusDialog
        open={addStatusOpen}
        onOpenChange={setAddStatusOpen}
        onCreate={async (name, category) => {
          const res = await createStatus(projectId, { name, category });
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          refresh();
          return true;
        }}
      />

      {/* Delete status dialog */}
      <Dialog open={!!deleteStatusTarget} onOpenChange={(open) => !open && setDeleteStatusTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف وضعیت</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            وظایف دارای وضعیت «{deleteStatusTarget?.name}» به وضعیت پیش‌فرض منتقل می‌شوند.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStatusTarget(null)}>انصراف</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteStatusTarget) return;
                const res = await deleteStatus(projectId, deleteStatusTarget.id);
                if (!res.ok) toast.error(res.error);
                else {
                  toast.success("وضعیت حذف شد");
                  setDeleteStatusTarget(null);
                  refresh();
                }
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

function AddStatusDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, category: "TODO" | "IN_PROGRESS" | "DONE") => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"TODO" | "IN_PROGRESS" | "DONE">("TODO");
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>وضعیت جدید</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              const ok = await onCreate(name.trim(), category);
              if (ok) {
                setName("");
                setCategory("TODO");
                onOpenChange(false);
              }
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="status-name">نام وضعیت</Label>
            <Input
              id="status-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={40}
              placeholder="مثلاً در بازبینی"
            />
          </div>
          <div className="space-y-1.5">
            <Label>دسته</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CATEGORY_LABELS) as ("TODO" | "IN_PROGRESS" | "DONE")[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {STATUS_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>افزودن</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
