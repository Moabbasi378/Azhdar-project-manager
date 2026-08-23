"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, GripVertical, Layers, Target, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IssueTypeIcon } from "@/components/issues/issue-type-icon";
import { PriorityIcon } from "@/components/issues/priority-icon";
import { moveIssue } from "@/actions/issue";
import { orderBetween } from "@/lib/order";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/jalali";
import type { BoardIssue } from "@/components/board/issue-card";

export type BacklogSprint = {
  id: string;
  name: string;
  goal: string | null;
  state: "PLANNED" | "ACTIVE" | "COMPLETED";
  startDate: string | null;
  endDate: string | null;
};

export type BacklogEpic = { id: string; key: string; title: string };

const SPRINT_CAPACITY = 40;

export function BacklogView({
  initialBacklog,
  initialSprints,
  epics,
  canEdit,
}: {
  initialBacklog: BoardIssue[];
  initialSprints: { sprint: BacklogSprint; issues: BoardIssue[] }[];
  epics: BacklogEpic[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [backlog, setBacklog] = useState(initialBacklog);
  const [sprints, setSprints] = useState(initialSprints);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const allIssues = useMemo(
    () => [...backlog, ...sprints.flatMap((s) => s.issues)],
    [backlog, sprints],
  );
  const activeIssue = activeId ? allIssues.find((i) => i.id === activeId) : null;

  const epicGroups = useMemo(() => {
    // ordered rows: epic header before its issues, then ungrouped at the end
    const byEpic = new Map<string, BoardIssue[]>();
    const noEpic: BoardIssue[] = [];
    for (const issue of backlog) {
      if (issue.epicId) {
        const list = byEpic.get(issue.epicId) ?? [];
        list.push(issue);
        byEpic.set(issue.epicId, list);
      } else {
        noEpic.push(issue);
      }
    }
    const rows: ({ type: "epic"; epic: BacklogEpic } | { type: "issue"; issue: BoardIssue })[] = [];
    for (const epic of epics) {
      const issues = byEpic.get(epic.id);
      if (!issues || issues.length === 0) continue;
      if (!collapsedEpics.has(epic.id)) {
        rows.push({ type: "epic", epic });
        for (const issue of issues) rows.push({ type: "issue", issue });
      } else {
        rows.push({ type: "epic", epic });
      }
    }
    for (const issue of noEpic) rows.push({ type: "issue", issue });
    return rows;
  }, [backlog, epics, collapsedEpics]);

  function findContainer(issueId: string): { kind: "backlog" } | { kind: "sprint"; id: string } | null {
    if (backlog.some((i) => i.id === issueId)) return { kind: "backlog" };
    for (const s of sprints) {
      if (s.issues.some((i) => i.id === issueId)) return { kind: "sprint", id: s.sprint.id };
    }
    return null;
  }

  async function persist(issueId: string, sprintId: string | null, beforeId: string | null, afterId: string | null) {
    const res = await moveIssue({ id: issueId, sprintId, beforeId, afterId });
    if (!res.ok) {
      toast.error(res.error);
      router.refresh();
    }
  }

  function moveOptimistic(issue: BoardIssue, target: { kind: "backlog" } | { kind: "sprint"; id: string }, newOrder: string) {
    const updated = { ...issue, order: newOrder, sprintId: target.kind === "sprint" ? target.id : null };
    setBacklog((prev) => {
      const without = prev.filter((i) => i.id !== issue.id);
      return target.kind === "backlog"
        ? [...without, updated].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
        : without;
    });
    setSprints((prev) =>
      prev.map((s) => {
        const without = s.issues.filter((i) => i.id !== issue.id);
        if (target.kind === "sprint" && s.sprint.id === target.id) {
          return {
            ...s,
            issues: [...without, updated].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0)),
          };
        }
        return { ...s, issues: without };
      }),
    );
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !canEdit) return;
    const draggedId = String(active.id);

    const source = findContainer(draggedId);
    if (!source) return;

    // determine target container
    const overData = over.data.current as { containerKind?: string; sprintId?: string } | undefined;
    let target: { kind: "backlog" } | { kind: "sprint"; id: string };
    if (overData?.containerKind === "backlog") {
      target = { kind: "backlog" };
    } else if (overData?.containerKind === "sprint") {
      target = { kind: "sprint", id: overData.sprintId! };
    } else {
      const c = findContainer(String(over.id));
      if (!c) return;
      target = c;
    }

    // compute order among target list (excluding dragged)
    const targetList =
      target.kind === "backlog"
        ? backlog.filter((i) => i.id !== draggedId)
        : (sprints.find((s) => s.sprint.id === target.id)?.issues ?? []).filter((i) => i.id !== draggedId);

    const overIndex = targetList.findIndex((i) => i.id === over.id);
    let beforeId: string | null;
    let afterId: string | null;
    let newOrder: string;
    if (overIndex === -1) {
      const last = targetList[targetList.length - 1];
      beforeId = last?.id ?? null;
      afterId = null;
      newOrder = orderBetween(last?.order ?? null, null);
    } else {
      const prev = targetList[overIndex - 1];
      const next = targetList[overIndex];
      beforeId = prev?.id ?? null;
      afterId = next?.id ?? null;
      newOrder = orderBetween(prev?.order ?? null, next.order);
    }

    const dragged = allIssues.find((i) => i.id === draggedId);
    if (!dragged) return;
    moveOptimistic(dragged, target, newOrder);
    startTransition(() => {
      void persist(draggedId, target.kind === "sprint" ? target.id : null, beforeId, afterId);
    });
  }

  /** Non-drag alternative: menu on each row. */
  function moveTo(issue: BoardIssue, target: { kind: "backlog" } | { kind: "sprint"; id: string }) {
    const current = findContainer(issue.id);
    if (
      !canEdit ||
      (current?.kind === "backlog" && target.kind === "backlog") ||
      (current?.kind === "sprint" && target.kind === "sprint" && current.id === target.id)
    )
      return;
    const targetList =
      target.kind === "backlog"
        ? backlog.filter((i) => i.id !== issue.id)
        : (sprints.find((s) => s.sprint.id === target.id)?.issues ?? []).filter((i) => i.id !== issue.id);
    const last = targetList[targetList.length - 1];
    const newOrder = orderBetween(last?.order ?? null, null);
    moveOptimistic(issue, target, newOrder);
    startTransition(() => {
      void persist(issue.id, target.kind === "sprint" ? target.id : null, last?.id ?? null, null);
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        {/* Backlog section */}
        <section>
          <header className="mb-2 flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">بک‌لاگ</h2>
            <span className="text-xs text-muted-foreground">
              ({toPersianDigits(backlog.length)} وظیفه)
            </span>
          </header>

          <BacklogDropArea kind="backlog" sprintId={undefined}>
            <SortableContext items={backlog.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {backlog.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    بک‌لاگ خالی است. وظایف را از اسپرینت‌ها به اینجا بکشید یا وظیفه جدید بسازید.
                  </p>
                )}
                {epicGroups.map((row) =>
                  row.type === "epic" ? (
                    <EpicGroupHeader
                      key={`epic-${row.epic.id}`}
                      epic={row.epic}
                      collapsed={collapsedEpics.has(row.epic.id)}
                      onToggle={() =>
                        setCollapsedEpics((prev) => {
                          const next = new Set(prev);
                          if (next.has(row.epic.id)) next.delete(row.epic.id);
                          else next.add(row.epic.id);
                          return next;
                        })
                      }
                    />
                  ) : (
                    <BacklogRow
                      key={row.issue.id}
                      issue={row.issue}
                      canEdit={canEdit}
                      sprints={sprints}
                      onMoveTo={moveTo}
                    />
                  ),
                )}
              </div>
            </SortableContext>
          </BacklogDropArea>
        </section>

        {/* Sprint sections */}
        {sprints.map(({ sprint, issues }) => {
          const points = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
          const pct = Math.min(100, Math.round((points / SPRINT_CAPACITY) * 100));
          const over = points > SPRINT_CAPACITY;
          return (
            <section key={sprint.id}>
              <header className="mb-2 flex flex-wrap items-center gap-2">
                <Target className={cn("size-4", sprint.state === "ACTIVE" ? "text-success" : "text-muted-foreground")} />
                <h2 className="text-sm font-semibold">{sprint.name}</h2>
                <Badge variant={sprint.state === "ACTIVE" ? "success" : "outline"}>
                  {sprint.state === "ACTIVE" ? "فعال" : "برنامه‌ریزی شده"}
                </Badge>
                <span className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn(over && "font-semibold text-destructive")}>
                    {toPersianDigits(points)} / {toPersianDigits(SPRINT_CAPACITY)} امتیاز
                  </span>
                  {over && <TriangleAlert className="size-3.5 text-destructive" />}
                </span>
              </header>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : "bg-primary")}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <BacklogDropArea kind="sprint" sprintId={sprint.id}>
                <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {issues.length === 0 && (
                      <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                        وظایف را از بک‌لاگ به اینجا بکشید
                      </p>
                    )}
                    {issues.map((issue) => (
                      <BacklogRow key={issue.id} issue={issue} canEdit={canEdit} sprints={sprints} onMoveTo={moveTo} />
                    ))}
                  </div>
                </SortableContext>
              </BacklogDropArea>
            </section>
          );
        })}
      </div>

      <DragOverlay>
        {activeIssue && (
          <div className="w-[calc(100%-2rem)] max-w-2xl rotate-1 opacity-90">
            <StaticRow issue={activeIssue} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function BacklogDropArea({
  kind,
  sprintId,
  children,
}: {
  kind: "backlog" | "sprint";
  sprintId?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${kind}-${sprintId ?? "root"}`,
    data: { containerKind: kind, sprintId },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border border-border bg-card p-2 transition-colors",
        isOver && "border-primary/60 bg-accent/30",
      )}
    >
      {children}
    </div>
  );
}

function BacklogRow({
  issue,
  canEdit,
  sprints,
  onMoveTo,
}: {
  issue: BoardIssue;
  canEdit: boolean;
  sprints: { sprint: BacklogSprint; issues: BoardIssue[] }[];
  onMoveTo: (issue: BoardIssue, target: { kind: "backlog" } | { kind: "sprint"; id: string }) => void;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    data: { type: "backlog-issue" },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-secondary/60",
        isDragging && "z-10 bg-card shadow-md",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="-ms-1 cursor-grab touch-none rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="جابه‌جایی"
      >
        <GripVertical className="size-3.5" />
      </button>
      <IssueTypeIcon type={issue.type} />
      <button
        onClick={() => router.push(`/issue/${issue.key}`)}
        dir="ltr"
        className="shrink-0 font-mono text-[11px] text-muted-foreground hover:text-primary hover:underline"
      >
        {issue.key}
      </button>
      <button
        onClick={() => router.push(`/issue/${issue.key}`)}
        className="min-w-0 truncate text-right hover:text-primary"
      >
        {issue.title}
      </button>

      <span className="mr-auto flex shrink-0 items-center gap-1.5">
        {issue.labels.slice(0, 1).map(({ label }) => (
          <span key={label.id} title={label.name} className="hidden size-2 rounded-full sm:inline-block" style={{ backgroundColor: label.color }} />
        ))}
        <PriorityIcon priority={issue.priority} className="size-3" />
        {canEdit ? (
          <PointsEditor issueId={issue.id} value={issue.storyPoints} />
        ) : (
          issue.storyPoints !== null && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded bg-accent px-1 text-[10px] font-bold text-accent-foreground">
              {toPersianDigits(issue.storyPoints)}
            </span>
          )
        )}
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
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                aria-label="انتقال به اسپرینت"
              >
                <ChevronLeft className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>انتقال به</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => onMoveTo(issue, { kind: "backlog" })}>
                <Layers /> بک‌لاگ
              </DropdownMenuItem>
              {sprints.map(({ sprint }) => (
                <DropdownMenuItem
                  key={sprint.id}
                  onSelect={() => onMoveTo(issue, { kind: "sprint", id: sprint.id })}
                >
                  <Target /> {sprint.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </span>
    </div>
  );
}

function StaticRow({ issue }: { issue: BoardIssue }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm">
      <IssueTypeIcon type={issue.type} />
      <span dir="ltr" className="font-mono text-[11px] text-muted-foreground">{issue.key}</span>
      <span className="truncate">{issue.title}</span>
    </div>
  );
}

function PointsEditor({ issueId, value }: { issueId: string; value: number | null }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function set(points: number | null) {
    setOpen(false);
    startTransition(() => {
      void import("@/actions/issue").then(({ updateIssue }) =>
        updateIssue({ id: issueId, storyPoints: points }).then((res) => {
          if (!res.ok) toast.error(res.error);
          else router.refresh();
        }),
      );
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold transition-colors",
          value !== null
            ? "bg-accent text-accent-foreground"
            : "border border-dashed border-input text-muted-foreground opacity-0 group-hover:opacity-100",
        )}
        aria-label="تغییر استوری پوینت"
      >
        {value !== null ? toPersianDigits(value) : "—"}
      </button>
    );
  }
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <span className="flex h-5 min-w-5 items-center justify-center rounded bg-accent px-1 text-[10px] font-bold text-accent-foreground">
          {value !== null ? toPersianDigits(value) : "—"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => set(null)}>—</DropdownMenuItem>
        {[0, 1, 2, 3, 5, 8, 13, 21].map((p) => (
          <DropdownMenuItem key={p} onSelect={() => set(p)}>
            {toPersianDigits(p)} امتیاز
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EpicGroupHeader({
  epic,
  collapsed,
  onToggle,
}: {
  epic: BacklogEpic;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="mt-2 flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs text-muted-foreground first:mt-0 hover:bg-secondary/50"
    >
      {collapsed ? <ChevronDown className="size-3 rotate-[-90deg]" /> : <ChevronDown className="size-3" />}
      <Layers className="size-3 text-violet-500" />
      <span dir="ltr" className="font-mono text-[10px]">{epic.key}</span>
      <span className="font-medium text-foreground/80">{epic.title}</span>
    </button>
  );
}
