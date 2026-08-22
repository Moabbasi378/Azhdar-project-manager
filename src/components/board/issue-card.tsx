"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { IssueTypeIcon } from "@/components/issues/issue-type-icon";
import { PriorityIcon } from "@/components/issues/priority-icon";
import { cn, PRIORITY_LABELS } from "@/lib/utils";
import { toPersianDigits } from "@/lib/jalali";

export type BoardIssue = {
  id: string;
  key: string;
  title: string;
  type: "EPIC" | "STORY" | "TASK" | "BUG" | "SUBTASK";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  storyPoints: number | null;
  order: string;
  statusId: string | null;
  sprintId: string | null;
  epicId: string | null;
  dueAt: string | null;
  assignee: { id: string; firstName: string; lastName: string; avatarColor: string } | null;
  labels: { label: { id: string; name: string; color: string } }[];
};

export function IssueCard({
  issue,
  onOpen,
  showSprintBadge,
}: {
  issue: BoardIssue;
  onOpen?: () => void;
  showSprintBadge?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    data: { type: "issue", issue },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative rounded-lg border border-border bg-card p-2.5 text-sm shadow-none transition-colors",
        isDragging && "z-10 rotate-1 border-primary/50 shadow-lg",
        listeners ? "cursor-grab active:cursor-grabbing" : "",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`باز کردن ${issue.key}`}
      />
      <div className="flex items-center gap-1.5">
        <GripVertical
          className="-m-1 touch-none rounded p-0.5 text-muted-foreground/0 size-4 transition-colors group-hover:text-muted-foreground/60"
          aria-hidden="true"
        />
        <span dir="ltr" className="font-mono text-[10px] text-muted-foreground">
          {issue.key}
        </span>
        <span className="mr-auto flex items-center gap-1">
          {issue.storyPoints !== null && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded bg-accent px-1 text-[9px] font-bold text-accent-foreground">
              {toPersianDigits(issue.storyPoints)}
            </span>
          )}
          <PriorityIcon
            priority={issue.priority}
            className="size-3"
          />
          <span className="sr-only">{PRIORITY_LABELS[issue.priority]}</span>
        </span>
      </div>

      <p className="mt-1 line-clamp-2 px-0.5 leading-5">{issue.title}</p>

      <div className="mt-1.5 flex items-center gap-1.5">
        <IssueTypeIcon type={issue.type} />
        {issue.labels.slice(0, 2).map(({ label }) => (
          <span
            key={label.id}
            title={label.name}
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: label.color }}
          />
        ))}
        {showSprintBadge && issue.sprintId && (
          <span className="rounded bg-secondary px-1 py-px text-[9px] text-muted-foreground">
            اسپرینت
          </span>
        )}
        {issue.assignee ? (
          <Avatar {...issue.assignee} size="xs" className="mr-auto" />
        ) : (
          <span className="mr-auto size-5 rounded-full border border-dashed border-input" />
        )}
      </div>
    </div>
  );
}

/** Static card variant for lists that don't participate in DnD. */
export function IssueCardStatic({
  issue,
  onOpen,
}: {
  issue: BoardIssue;
  onOpen?: () => void;
}) {
  return (
    <div className="relative rounded-lg border border-border bg-card p-2.5 text-sm">
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`باز کردن ${issue.key}`}
      />
      <div className="flex items-center gap-1.5">
        <span dir="ltr" className="font-mono text-[10px] text-muted-foreground">{issue.key}</span>
        <span className="mr-auto flex items-center gap-1">
          {issue.storyPoints !== null && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded bg-accent px-1 text-[9px] font-bold text-accent-foreground">
              {toPersianDigits(issue.storyPoints)}
            </span>
          )}
          <PriorityIcon priority={issue.priority} className="size-3" />
        </span>
      </div>
      <p className="mt-1 line-clamp-2 px-0.5 leading-5">{issue.title}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <IssueTypeIcon type={issue.type} />
        {issue.assignee ? (
          <Avatar {...issue.assignee} size="xs" className="mr-auto" />
        ) : (
          <span className="mr-auto size-5 rounded-full border border-dashed border-input" />
        )}
      </div>
    </div>
  );
}
