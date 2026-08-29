"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { importIssues } from "@/actions/issue";
import {
  downloadXlsxTemplate,
  parseWorkbook,
  resolveAssignees,
  type ParsedIssue,
  type IssueImportMember,
} from "@/lib/excel-import";
import { ISSUE_TYPE_META } from "@/components/issues/issue-type-icon";
import { PRIORITY_META } from "@/components/issues/priority-icon";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/jalali";

type ProjectMember = IssueImportMember & { email?: string | null };

export type ImportTarget = { kind: "backlog" } | { kind: "sprint"; id: string };

export function ImportFromExcelDialog({
  projectId,
  sprints,
  defaultTarget,
  trigger,
}: {
  projectId: string;
  sprints: { id: string; name: string }[];
  defaultTarget: ImportTarget;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(defaultTarget.kind === "sprint" ? defaultTarget.id : "backlog");
  const [issues, setIssues] = useState<ParsedIssue[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imported, setImported] = useState<{ count: number; keys: string[] } | null>(null);
  const [, startTransition] = useTransition();

  const { data: meta } = useQuery<{ members: ProjectMember[] }>({
    queryKey: ["project-meta", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/meta`);
      if (!res.ok) throw new Error("خطا در دریافت اطلاعات پروژه");
      return res.json();
    },
    enabled: open,
    staleTime: 30_000,
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      setIssues(null);
      setFileName(null);
      setFileError(null);
      setImported(null);
      if (fileInput.current) fileInput.current.value = "";
    }
    setOpen(next);
  }

  /** Members may still be loading when a file is picked — fetch them on demand. */
  async function ensureMembers(): Promise<ProjectMember[]> {
    if (meta?.members) return meta.members;
    const res = await fetch(`/api/projects/${projectId}/meta`);
    if (!res.ok) throw new Error("خطا در دریافت اطلاعات پروژه");
    const data: { members: ProjectMember[] } = await res.json();
    return data.members;
  }

  async function handleFile(file: File) {
    setFileError(null);
    setImported(null);
    try {
      const buf = await file.arrayBuffer();
      const members = await ensureMembers();
      const parsed = parseWorkbook(buf);
      resolveAssignees(parsed, members);
      setIssues(parsed);
      setFileName(file.name);
      if (parsed.length === 0) setFileError("در فایل هیچ وظیفه‌ای پیدا نشد.");
    } catch (err) {
      setIssues(null);
      setFileName(file.name);
      setFileError(
        err instanceof Error && err.message === "FILE_HAS_NO_TITLE_COLUMN"
          ? "ستونی با عنوان «عنوان» در فایل پیدا نشد. لطفاً از قالب نمونه استفاده کنید."
          : "خواندن فایل ممکن نشد. لطفاً یک فایل Excel معتبر انتخاب کنید.",
      );
    }
  }

  const errorCount = issues?.filter((i) => i.error).length ?? 0;

  async function submit() {
    if (!issues || errorCount > 0) return;
    setSubmitting(true);
    try {
      const res = await importIssues({
        projectId,
        sprintId: target === "backlog" ? null : target,
        issues: issues.map((i) => ({
          title: i.title,
          type: i.type,
          priority: i.priority,
          storyPoints: i.storyPoints,
          estimatedMinutes: i.estimatedMinutes,
          description: i.description,
          assigneeId: i.assigneeId,
        })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.data.count === 1
          ? `وظیفه ${res.data.keys[0]} وارد شد.`
          : `${toPersianDigits(res.data.count)} وظیفه وارد شد.`,
      );
      setImported(res.data);
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? <ImportButton />}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>وارد کردن وظایف از Excel</DialogTitle>
          <DialogDescription>
            فایل اکسل را انتخاب کنید؛ وظایف آن به اسپرینت انتخابی اضافه می‌شود.
          </DialogDescription>
        </DialogHeader>

        {/* Target sprint selector */}
        <div className="space-y-1.5">
          <Label>مقصد</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">بک‌لاگ</SelectItem>
              {sprints.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File picker */}
        <div className="space-y-1.5">
          <Label>فایل Excel</Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              className="flex-1"
            >
              <FileSpreadsheet className="size-4" />
              {fileName ?? "انتخاب فایل ..."}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => downloadXlsxTemplate()}
              title="دانلود قالب نمونه"
            >
              <Download className="size-4" />
              قالب
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            ستون‌ها: عنوان (الزامی)، نوع، اولویت، استوری پوینت، زمان تخمینی (ساعت)، توضیحات، مسئول
          </p>
        </div>

        {fileError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {fileError}
          </div>
        )}

        {/* Preview */}
        {issues && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {toPersianDigits(issues.length)} وظیفه
                {errorCount > 0 && (
                  <span className="ms-2 font-semibold text-destructive">
                    {toPersianDigits(errorCount)} خطا
                  </span>
                )}
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-secondary/80 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-right font-medium">ردیف</th>
                    <th className="px-2 py-1.5 text-right font-medium">عنوان</th>
                    <th className="px-2 py-1.5 text-right font-medium">نوع</th>
                    <th className="px-2 py-1.5 text-right font-medium">اولویت</th>
                    <th className="px-2 py-1.5 text-right font-medium">مسئول</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr
                      key={`${issue.row}-${issue.title}`}
                      className={cn("border-t border-border/60", issue.error && "bg-destructive/5")}
                    >
                      <td className="px-2 py-1 text-muted-foreground">{toPersianDigits(issue.row)}</td>
                      <td className="px-2 py-1">
                        <span className="line-clamp-1">{issue.title || "—"}</span>
                        {issue.error && <span className="block text-[10px] text-destructive">{issue.error}</span>}
                      </td>
                      <td className="px-2 py-1">
                        <span className={ISSUE_TYPE_META[issue.type].color}>
                          {ISSUE_TYPE_META[issue.type].label}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <span className={PRIORITY_META[issue.priority].color}>
                          {PRIORITY_META[issue.priority].label}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        {issue.assigneeId ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="size-3" />
                            {issue.assignee}
                          </span>
                        ) : (
                          <span className={cn(issue.assignee && !issue.error && "text-muted-foreground")}>
                            {issue.assignee || "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {imported && (
          <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
            <CheckCircle2 className="size-4" />
            {imported.count === 1
              ? `وظیفه ${imported.keys[0]} با موفقیت وارد شد.`
              : `${toPersianDigits(imported.count)} وظیفه با موفقیت وارد شد.`}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            بستن
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={!issues || errorCount > 0 || submitting || imported !== null}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            وارد کردن {issues && !errorCount ? `(${toPersianDigits(issues.length)})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Fallback trigger; forwards props so the DialogTrigger can hook the click. */
function ImportButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button type="button" variant="outline" size="sm" {...props}>
      <FileSpreadsheet className="size-4" />
      وارد کردن از Excel
    </Button>
  );
}