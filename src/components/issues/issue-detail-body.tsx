"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Clock,
  Flag,
  GitBranch,
  Layers,
  ListTree,
  Loader2,
  Pencil,
  Plus,
  Send,
  Tag,
  Target,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IssueTypeIcon, ISSUE_TYPE_META } from "@/components/issues/issue-type-icon";
import { PriorityIcon, PRIORITY_META } from "@/components/issues/priority-icon";
import { addComment, createIssue, deleteIssue, logTime, updateIssue } from "@/actions/issue";
import { formatDuration, formatJalali, formatJalaliDateTime, formatRelative, toPersianDigits } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import type { IssueDetailData, UserLite } from "@/lib/issue-types";

const STORY_POINTS = [0, 1, 2, 3, 5, 8, 13, 21];

function activityText(a: IssueDetailData["issue"]["activities"][number]): string {
  switch (a.kind) {
    case "CREATED":
      return "وظیفه را ایجاد کرد.";
    case "STATUS_CHANGED":
      return a.field === "اسپرینت"
        ? "وظیفه بین اسپرینت‌ها جابه‌جا شد."
        : `وضعیت را از «${a.oldValue ?? "—"}» به «${a.newValue ?? "—"}» تغییر داد.`;
    case "ASSIGNED":
      return "مسئول وظیفه را تغییر داد.";
    case "POINTS_CHANGED":
      return `استوری پوینت از ${a.oldValue ? toPersianDigits(a.oldValue) : "—"} به ${a.newValue ? toPersianDigits(a.newValue) : "—"} تغییر کرد.`;
    case "PRIORITY_CHANGED":
      return `اولویت از «${a.oldValue ?? "—"}» به «${a.newValue ?? "—"}» تغییر کرد.`;
    case "TIME_LOGGED": {
      const minutes = Number(a.newValue ?? 0);
      return `${formatDuration(minutes)} زمان ثبت کرد.`;
    }
    case "COMMENTED":
      return "کامنت جدیدی اضافه کرد.";
    case "MOVED_SPRINT":
      return "وظیفه به اسپرینت دیگری منتقل شد.";
    default:
      return a.field ? `«${a.field}» را به‌روزرسانی کرد.` : "وظیفه را به‌روزرسانی کرد.";
  }
}

export function IssueDetailBody({
  data,
  compact,
}: {
  data: IssueDetailData;
  compact?: boolean;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { issue, meta } = data;
  const canEdit = meta.canEdit;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["issue", issue.key] });
    router.refresh();
  };

  async function patch(fields: Record<string, unknown>) {
    const res = await updateIssue({ id: issue.id, ...fields });
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    invalidate();
    return true;
  }

  return (
    <div className={cn("space-y-6", compact ? "p-5" : "p-6 max-w-4xl")}>
      {/* Parent / epic breadcrumb */}
      {(issue.parent || issue.epic) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {issue.parent && (
            <Link href={`/issue/${issue.parent.key}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <ListTree className="size-3.5" />
              <span dir="ltr" className="font-mono">{issue.parent.key}</span> {issue.parent.title}
            </Link>
          )}
          {issue.parent && issue.epic && <span>›</span>}
          {issue.epic && (
            <Link href={`/issue/${issue.epic.key}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Layers className="size-3.5 text-violet-500" />
              <span dir="ltr" className="font-mono">{issue.epic.key}</span> {issue.epic.title}
            </Link>
          )}
        </div>
      )}

      {/* Type + key row */}
      <div className="flex items-center gap-2">
        <IssueTypeIcon type={issue.type} className="size-4" />
        <span className="text-xs font-medium">{ISSUE_TYPE_META[issue.type].label}</span>
        {!compact && (
          <>
            <span className="text-muted-foreground">·</span>
            <Link href={`/issue/${issue.key}`} dir="ltr" className="font-mono text-xs text-muted-foreground hover:text-foreground">
              {issue.key}
            </Link>
          </>
        )}
      </div>

      {/* Title */}
      <EditableText
        value={issue.title}
        canEdit={canEdit}
        className="text-lg font-semibold leading-snug"
        placeholder="عنوان"
        onSave={(title) => patch({ title })}
      />

      {/* Description */}
      <section>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">توضیحات</h3>
        <EditableDescription value={issue.description} canEdit={canEdit} onSave={(description) => patch({ description })} />
      </section>

      {/* Properties */}
      <section className="rounded-xl border border-border bg-background/50 p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Prop label="وضعیت" icon={<GitBranch className="size-3.5" />}>
            <Select
              value={issue.status?.id ?? "none"}
              disabled={!canEdit}
              onValueChange={(statusId) => patch({ statusId: statusId === "none" ? null : statusId })}
            >
              <SelectTrigger size="sm" className="border-0 bg-secondary/60 px-2">
                <StatusDot category={issue.status?.category} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meta.statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Prop>

          <Prop label="مسئول" icon={<UserIcon className="size-3.5" />}>
            <UserPicker
              users={meta.members}
              value={issue.assignee}
              allowEmpty
              disabled={!canEdit}
              onChange={(assigneeId) => patch({ assigneeId })}
            />
          </Prop>

          <Prop label="اولویت" icon={<Flag className="size-3.5" />}>
            <Select
              value={issue.priority}
              disabled={!canEdit}
              onValueChange={(priority) => patch({ priority })}
            >
              <SelectTrigger size="sm" className="border-0 bg-secondary/60 px-2">
                <PriorityIcon priority={issue.priority} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_META).map(([value, m]) => (
                  <SelectItem key={value} value={value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Prop>

          <Prop label="اسپرینت" icon={<Target className="size-3.5" />}>
            <Select
              value={issue.sprint?.id ?? "backlog"}
              disabled={!canEdit}
              onValueChange={(sprintId) => patch({ sprintId: sprintId === "backlog" ? null : sprintId })}
            >
              <SelectTrigger size="sm" className="border-0 bg-secondary/60 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">بک‌لاگ</SelectItem>
                {meta.sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Prop>

          <Prop label="اپیک" icon={<Layers className="size-3.5" />}>
            <Select
              value={issue.epic?.id ?? "none"}
              disabled={!canEdit}
              onValueChange={(epicId) => patch({ epicId: epicId === "none" ? null : epicId })}
            >
              <SelectTrigger size="sm" className="border-0 bg-secondary/60 px-2">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون اپیک</SelectItem>
                {meta.epics.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span dir="ltr" className="font-mono text-[10px] text-muted-foreground">{e.key}</span>{" "}
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Prop>

          <Prop label="استوری پوینت" icon={<Target className="size-3.5" />}>
            <Select
              value={issue.storyPoints === null ? "none" : String(issue.storyPoints)}
              disabled={!canEdit}
              onValueChange={(v) => patch({ storyPoints: v === "none" ? null : Number(v) })}
            >
              <SelectTrigger size="sm" className="border-0 bg-secondary/60 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {STORY_POINTS.map((p) => (
                  <SelectItem key={p} value={String(p)}>{toPersianDigits(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Prop>

          <Prop label="زمان تخمینی" icon={<Clock className="size-3.5" />}>
            <MinutesInput
              minutes={issue.estimatedMinutes}
              disabled={!canEdit}
              onSave={(estimatedMinutes) => patch({ estimatedMinutes })}
            />
          </Prop>

          <Prop label="زمان صرف‌شده" icon={<Clock className="size-3.5" />}>
            <span className="text-sm">{formatDuration(issue.loggedMinutes)}</span>
          </Prop>

          <Prop label="سررسید" icon={<CalendarDays className="size-3.5" />}>
            <DateInput
              value={issue.dueAt}
              disabled={!canEdit}
              onSave={(dueAt) => patch({ dueAt })}
            />
          </Prop>
        </div>

        {/* Labels */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <Tag className="size-3.5 text-muted-foreground" />
          {issue.labels.length === 0 && !canEdit && (
            <span className="text-xs text-muted-foreground">برچسبی ندارد</span>
          )}
          {issue.labels.map(({ label }) => (
            <Badge key={label.id} variant="outline" style={{ color: label.color }}>
              {label.name}
            </Badge>
          ))}
          {canEdit && (
            <LabelsEditor
              allLabels={meta.labels}
              selectedIds={issue.labels.map((l) => l.label.id)}
              onToggle={async (labelIds) => {
                await patch({ labelIds });
              }}
            />
          )}
        </div>
      </section>

      {/* Subtasks */}
      <SubtasksSection issue={issue} canEdit={canEdit} onChanged={invalidate} />

      {/* Time tracking */}
      <TimeSection issue={issue} canEdit={canEdit} onChanged={invalidate} />

      {/* Comments */}
      <CommentsSection issue={issue} onChanged={invalidate} />

      {/* Activity */}
      <section>
        <h3 className="mb-3 text-xs font-semibold text-muted-foreground">فعالیت‌ها</h3>
        <ol className="space-y-3">
          {issue.activities.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5 text-sm">
              <Avatar
                firstName={a.user.firstName}
                lastName={a.user.lastName}
                color={a.user.avatarColor}
                imageUrl={a.user.avatarImage}
                icon={a.user.avatarIcon}
                size="xs"
              />
              <p className="leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">
                  {a.user.firstName} {a.user.lastName}
                </span>{" "}
                {activityText(a)}{" "}
                <time title={formatJalaliDateTime(a.createdAt)} className="text-[11px]">
                  {formatRelative(a.createdAt)}
                </time>
              </p>
            </li>
          ))}
          {issue.activities.length === 0 && (
            <li className="text-sm text-muted-foreground">هنوز فعالیتی ثبت نشده است.</li>
          )}
        </ol>
      </section>

      {/* Danger zone (full page only) */}
      {!compact && canEdit && <DeleteButton issueId={issue.id} />}
    </div>
  );
}

// ─── Building blocks ─────────────────────────────────────────────

function Prop({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function StatusDot({ category }: { category?: string | null }) {
  const color =
    category === "DONE"
      ? "bg-success"
      : category === "IN_PROGRESS"
        ? "bg-primary"
        : "bg-muted-foreground/40";
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", color)} />;
}

function EditableText({
  value,
  canEdit,
  className,
  placeholder,
  onSave,
}: {
  value: string;
  canEdit: boolean;
  className?: string;
  placeholder?: string;
  onSave: (v: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={cn(
          "group -mx-2 w-full rounded-md px-2 py-1 text-right transition-colors",
          canEdit && "hover:bg-secondary/70",
          className,
        )}
      >
        {value || <span className="text-muted-foreground">{placeholder}</span>}
        {canEdit && (
          <Pencil className="ms-1.5 inline size-3 opacity-0 transition-opacity group-hover:opacity-40" />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === "Enter") {
            setSaving(true);
            const ok = await onSave(draft.trim());
            setSaving(false);
            if (ok) setEditing(false);
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
      />
      <Button
        size="icon-sm"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          const ok = await onSave(draft.trim());
          setSaving(false);
          if (ok) setEditing(false);
        }}
      >
        {saving ? <Loader2 className="animate-spin" /> : <Check />}
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(false)}>
        <X />
      </Button>
    </div>
  );
}

function EditableDescription({
  value,
  canEdit,
  onSave,
}: {
  value: string | null;
  canEdit: boolean;
  onSave: (v: string | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => {
          setDraft(value ?? "");
          setEditing(true);
        }}
        className={cn(
          "w-full rounded-lg border border-dashed border-transparent px-3 py-2 text-right text-sm leading-7 transition-colors",
          canEdit && "hover:border-input hover:bg-secondary/40",
          !value && "text-muted-foreground",
        )}
      >
        {value || "توضیحی اضافه نشده است…"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea rows={4} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const ok = await onSave(draft.trim() || null);
            setSaving(false);
            if (ok) setEditing(false);
          }}
        >
          {saving && <Loader2 className="animate-spin" />} ذخیره
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          انصراف
        </Button>
      </div>
    </div>
  );
}

function UserPicker({
  users,
  value,
  allowEmpty,
  disabled,
  onChange,
}: {
  users: UserLite[];
  value: UserLite | null;
  allowEmpty?: boolean;
  disabled?: boolean;
  onChange: (userId: string | null) => void;
}) {
  return (
    <Select
      value={value?.id ?? "__none"}
      disabled={disabled}
      onValueChange={(v) => onChange(v === "__none" ? null : v)}
    >
      <SelectTrigger size="sm" className="border-0 bg-secondary/60 px-2">
        {value ? (
          <span className="flex items-center gap-1.5">
            <Avatar {...value} size="xs" />
            <span>{value.firstName} {value.lastName}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">بدون مسئول</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none">بدون مسئول</SelectItem>}
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.firstName} {u.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MinutesInput({
  minutes,
  disabled,
  onSave,
}: {
  minutes: number | null;
  disabled?: boolean;
  onSave: (v: number | null) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(minutes !== null ? String(minutes / 60) : "");

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="text-sm hover:text-primary disabled:hover:text-inherit"
      >
        {minutes !== null ? formatDuration(minutes) : "—"}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        dir="ltr"
        className="h-7 w-20 text-left text-xs"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === "Enter") {
            const mins = Math.round(Number(hours) * 60);
            const ok = await onSave(Number.isFinite(mins) && mins > 0 ? mins : null);
            if (ok) setOpen(false);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      <span className="text-[11px] text-muted-foreground">ساعت</span>
    </div>
  );
}

function DateInput({
  value,
  disabled,
  onSave,
}: {
  value: string | null;
  disabled?: boolean;
  onSave: (v: string | null) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(
    value ? new Date(value).toISOString().slice(0, 10) : "",
  );

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="text-sm hover:text-primary disabled:hover:text-inherit"
      >
        {value ? formatJalali(value) : "—"}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        type="date"
        dir="ltr"
        className="h-7 w-36 text-left text-xs"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        onBlur={async () => {
          const ok = await onSave(date ? new Date(date).toISOString() : null);
          if (ok) setOpen(false);
        }}
        onKeyDown={async (e) => {
          if (e.key === "Enter") {
            const ok = await onSave(date ? new Date(date).toISOString() : null);
            if (ok) setOpen(false);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
    </div>
  );
}

function LabelsEditor({
  allLabels,
  selectedIds,
  onToggle,
}: {
  allLabels: { id: string; name: string; color: string }[];
  selectedIds: string[];
  onToggle: (labelIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-input px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          aria-label="ویرایش برچسب‌ها"
        >
          <Plus className="size-3" /> برچسب
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1.5" align="start">
        {allLabels.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">برچسبی تعریف نشده است</p>
        )}
        {allLabels.map((label) => {
          const checked = selectedIds.includes(label.id);
          return (
            <button
              key={label.id}
              type="button"
              onClick={() =>
                onToggle(
                  checked
                    ? selectedIds.filter((id) => id !== label.id)
                    : [...selectedIds, label.id],
                )
              }
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: label.color }} />
              {label.name}
              {checked && <Check className="mr-auto size-3.5 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function SubtasksSection({
  issue,
  canEdit,
  onChanged,
}: {
  issue: IssueDetailData["issue"];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const doneCount = issue.children.filter((c) => c.status?.category === "DONE").length;

  async function create() {
    if (title.trim().length < 2) return;
    setBusy(true);
    const res = await createIssue({
      projectId: issue.projectId,
      title: title.trim(),
      type: "SUBTASK",
      parentId: issue.id,
      sprintId: issue.sprint?.id ?? null,
      assigneeId: issue.assignee?.id ?? null,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setTitle("");
    setAdding(false);
    onChanged();
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <ListTree className="size-3.5" /> زیر‌وظیفه‌ها
          {issue.children.length > 0 && (
            <span className="font-normal">
              ({toPersianDigits(doneCount)} از {toPersianDigits(issue.children.length)} انجام شده)
            </span>
          )}
        </h3>
        {canEdit && !adding && (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <Plus /> افزودن
          </Button>
        )}
      </div>

      {issue.children.length > 0 && (
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${(doneCount / issue.children.length) * 100}%` }}
          />
        </div>
      )}

      <ul className="space-y-1">
        {issue.children.map((sub) => (
          <li key={sub.id}>
            <Link
              href={`/issue/${sub.key}`}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary/50"
            >
              <StatusDot category={sub.status?.category} />
              <span dir="ltr" className="font-mono text-[11px] text-muted-foreground">{sub.key}</span>
              <span className={cn("truncate", sub.status?.category === "DONE" && "text-muted-foreground line-through")}>
                {sub.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {adding && (
        <div className="mt-2 flex items-center gap-1.5">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="عنوان زیر‌وظیفه"
          />
          <Button size="icon-sm" disabled={busy} onClick={create}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => setAdding(false)}>
            <X />
          </Button>
        </div>
      )}
    </section>
  );
}

function TimeSection({
  issue,
  canEdit,
  onChanged,
}: {
  issue: IssueDetailData["issue"];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [logging, setLogging] = useState(false);
  const [hours, setHours] = useState("1");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const minutes = Math.round(Number(hours) * 60);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      toast.error("مدت نامعتبر است");
      return;
    }
    setBusy(true);
    const res = await logTime({ issueId: issue.id, minutes, description: desc.trim() || null });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("زمان ثبت شد");
    setLogging(false);
    setDesc("");
    onChanged();
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Clock className="size-3.5" /> ثبت زمان
        </h3>
        {canEdit && !logging && (
          <Button size="sm" variant="ghost" onClick={() => setLogging(true)}>
            <Plus /> ثبت زمان
          </Button>
        )}
      </div>

      {logging && (
        <div className="mb-3 space-y-2 rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              dir="ltr"
              type="number"
              min="0.25"
              step="0.25"
              className="h-8 w-24 text-left text-sm"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">ساعت</span>
            <Input
              className="h-8 flex-1 text-sm"
              placeholder="توضیح (اختیاری)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <Button size="sm" disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />} ثبت
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setLogging(false)}>
              انصراف
            </Button>
          </div>
        </div>
      )}

      <ul className="space-y-1.5">
        {issue.timeEntries.slice(0, 5).map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 text-sm">
            <Avatar {...entry.user} size="xs" />
            <span className="font-medium">{entry.user.firstName}</span>
            <Badge variant="outline">{formatDuration(entry.minutes)}</Badge>
            {entry.description && (
              <span className="truncate text-muted-foreground">{entry.description}</span>
            )}
            <time className="mr-auto shrink-0 text-[11px] text-muted-foreground">
              {formatJalali(entry.workedAt)}
            </time>
          </li>
        ))}
        {issue.timeEntries.length === 0 && (
          <li className="text-sm text-muted-foreground">هنوز زمانی ثبت نشده است.</li>
        )}
      </ul>
    </section>
  );
}

function CommentsSection({
  issue,
  onChanged,
}: {
  issue: IssueDetailData["issue"];
  onChanged: () => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionQuery = useMemo(() => {
    const match = body.match(/@([^\s@]*)$/);
    return match ? match[1] : null;
  }, [body]);

  const candidates: UserLite[] =
    mentionQuery !== null
      ? Array.from(
          new Map(
            [
              ...issue.comments.map((c) => c.author),
              ...(issue.assignee ? [issue.assignee] : []),
              ...(issue.reporter ? [issue.reporter] : []),
            ].map((u) => [u.id, u]),
          ).values(),
        ).filter((u) => u.firstName.includes(mentionQuery))
      : [];

  function applyMention(user: UserLite) {
    setBody((b) => b.replace(/@([^\s@]*)$/, `@${user.firstName} `));
    textareaRef.current?.focus();
  }

  async function submit() {
    if (body.trim().length === 0) return;
    setBusy(true);
    const res = await addComment({ issueId: issue.id, body: body.trim() });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setBody("");
    onChanged();
  }

  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold text-muted-foreground">
        کامنت‌ها ({toPersianDigits(issue.comments.length)})
      </h3>

      <ul className="mb-4 space-y-4">
        {issue.comments.map((comment) => (
          <li key={comment.id} className="flex items-start gap-2.5">
            <Avatar {...comment.author} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">
                  {comment.author.firstName} {comment.author.lastName}
                </span>
                <time className="text-[11px] text-muted-foreground">
                  {formatRelative(comment.createdAt)}
                </time>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                {renderMentions(comment.body)}
              </p>
            </div>
          </li>
        ))}
        {issue.comments.length === 0 && (
          <li className="text-sm text-muted-foreground">اولین کامنت را بنویسید…</li>
        )}
      </ul>

      <div className="relative">
        <Textarea
          ref={textareaRef}
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          placeholder="کامنت بنویسید… (@ برای منشن)"
        />
        {candidates.length > 0 && (
          <ul className="absolute bottom-full z-10 mb-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-md">
            {candidates.slice(0, 5).map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => applyMention(user)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                >
                  <Avatar {...user} size="xs" />
                  {user.firstName} {user.lastName}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex justify-end">
          <Button size="sm" disabled={busy || body.trim().length === 0} onClick={submit}>
            {busy ? <Loader2 className="animate-spin" /> : <Send />} ارسال
          </Button>
        </div>
      </div>
    </section>
  );
}

function renderMentions(body: string): React.ReactNode[] {
  const parts = body.split(/(@[\u0600-\u06FF\u200c\w]+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="rounded bg-accent px-1 font-medium text-accent-foreground">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function DeleteButton({ issueId }: { issueId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <section className="border-t border-border pt-4">
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-destructive">مطمئن هستید؟ این عمل قابل بازگشت نیست.</span>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await deleteIssue(issueId);
              setBusy(false);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success("وظیفه حذف شد");
              router.push("/dashboard");
              router.refresh();
            }}
          >
            {busy && <Loader2 className="animate-spin" />} حذف قطعی
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            انصراف
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirming(true)}>
          <Trash2 /> حذف وظیفه
        </Button>
      )}
    </section>
  );
}
