"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createIssue } from "@/actions/issue";
import { ISSUE_TYPE_META } from "@/components/issues/issue-type-icon";
import { PRIORITY_META } from "@/components/issues/priority-icon";
import { useShell } from "@/components/layout/app-shell";

const STORY_POINTS = [0, 1, 2, 3, 5, 8, 13, 21];

type ProjectMeta = {
  members: { id: string; firstName: string; lastName: string; avatarColor: string }[];
  sprints: { id: string; name: string; state: string }[];
  statuses: { id: string; name: string; category: string; isDefault: boolean }[];
};

export function QuickCreateDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const { projects } = useShell();
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [type, setType] = useState("TASK");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [priority, setPriority] = useState("MEDIUM");
  const [storyPoints, setStoryPoints] = useState<string>("none");
  const [sprintId, setSprintId] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      setProjectId(defaultProjectId ?? projects[0]?.id ?? "");
      setType("TASK");
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setPriority("MEDIUM");
      setStoryPoints("none");
      setSprintId("none");
    }
    onOpenChange(next);
  }

  const { data: meta } = useQuery<ProjectMeta>({
    queryKey: ["project-meta", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/meta`);
      if (!res.ok) throw new Error("خطا در دریافت اطلاعات پروژه");
      return res.json();
    },
    enabled: open && !!projectId,
    staleTime: 30_000,
  });

  const defaultStatusId = useMemo(
    () => meta?.statuses.find((s) => s.isDefault)?.id ?? meta?.statuses[0]?.id,
    [meta],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || title.trim().length < 2) return;
    setSubmitting(true);
    try {
      const res = await createIssue({
        projectId,
        title: title.trim(),
        description: description.trim() || null,
        type: type as "EPIC" | "STORY" | "TASK" | "BUG" | "SUBTASK",
        priority: priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        assigneeId: assigneeId || null,
        storyPoints: storyPoints === "none" ? null : Number(storyPoints),
        sprintId: sprintId === "none" ? null : sprintId,
        statusId: defaultStatusId ?? null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`وظیفه ${res.data.key} ایجاد شد`);
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ایجاد سریع وظیفه</DialogTitle>
          <DialogDescription>در چند ثانیه وظیفه جدید بسازید</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>نوع</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ISSUE_TYPE_META)
                    .filter(([value]) => value !== "SUBTASK")
                    .map(([value, meta]) => (
                      <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>پروژه</Label>
              <Select
                value={projectId}
                onValueChange={(v) => {
                  setProjectId(v);
                  setSprintId("none");
                  setAssigneeId("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="انتخاب پروژه" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qc-title">عنوان</Label>
            <Input
              id="qc-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="چه کاری باید انجام شود؟"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qc-desc">توضیحات (اختیاری)</Label>
            <Textarea
              id="qc-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>مسئول</Label>
              <Select value={assigneeId || "un"} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">بدون مسئول</SelectItem>
                  {meta?.members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>اولویت</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>استوری پوینت</Label>
              <Select value={storyPoints} onValueChange={setStoryPoints}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {STORY_POINTS.map((p) => (
                    <SelectItem key={p} value={String(p)}>{p.toLocaleString("fa-IR")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>اسپرینت</Label>
              <Select value={sprintId || "none"} onValueChange={setSprintId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بک‌لاگ</SelectItem>
                  {meta?.sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || title.trim().length < 2 || !projectId}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            ایجاد وظیفه
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
