"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensors,
  useSensor,
  pointerWithin,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Filter, Plus } from "lucide-react";
import { IssueCard, IssueCardStatic, type BoardIssue } from "@/components/board/issue-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { moveIssue } from "@/actions/issue";
import { orderBetween } from "@/lib/order";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/jalali";

export type BoardStatus = {
  id: string;
  name: string;
  category: "TODO" | "IN_PROGRESS" | "DONE";
};

type Member = { id: string; firstName: string; lastName: string; avatarColor: string };

export function BoardView({
  statuses,
  initialIssues,
  members,
  canEdit,
  sprintName,
}: {
  statuses: BoardStatus[];
  initialIssues: BoardIssue[];
  members: Member[];
  canEdit: boolean;
  sprintName?: string;
}) {
  const router = useRouter();
  const [issues, setIssues] = useState(initialIssues);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (query && !i.title.includes(query) && !i.key.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (assigneeFilter.length > 0 && !(i.assignee && assigneeFilter.includes(i.assignee.id)))
        return false;
      if (typeFilter.length > 0 && !typeFilter.includes(i.type)) return false;
      if (priorityFilter.length > 0 && !priorityFilter.includes(i.priority)) return false;
      return true;
    });
  }, [issues, query, assigneeFilter, typeFilter, priorityFilter]);

  const byStatus = useMemo(() => {
    const map = new Map<string, BoardIssue[]>();
    for (const s of statuses) map.set(s.id, []);
    for (const issue of filtered) {
      const list = map.get(issue.statusId ?? "");
      if (list) list.push(issue);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
    }
    return map;
  }, [filtered, statuses]);

  const activeIssue = activeId ? issues.find((i) => i.id === activeId) : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function persistMove(
    issueId: string,
    newStatusId: string | null,
    beforeId: string | null,
    afterId: string | null,
  ) {
    const res = await moveIssue({
      id: issueId,
      statusId: newStatusId,
      beforeId,
      afterId,
    });
    if (!res.ok) {
      toast.error(res.error);
      // rollback: reload server state
      router.refresh();
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id || !canEdit) return;

    const dragged = issues.find((i) => i.id === active.id);
    if (!dragged) return;

    const overData = over.data.current as
      | { type?: string; issue?: BoardIssue; statusId?: string }
      | undefined;

    let targetStatusId: string | null = dragged.statusId;
    let targetList: BoardIssue[];

    if (overData?.type === "column" && overData.statusId) {
      // dropped on column background (incl. empty columns)
      targetStatusId = overData.statusId;
      targetList = byStatus.get(targetStatusId) ?? [];
    } else if (overData?.type === "issue" && overData.issue) {
      targetStatusId = overData.issue.statusId;
      targetList = byStatus.get(targetStatusId ?? "") ?? [];
    } else {
      return;
    }

    if (!statuses.some((s) => s.id === targetStatusId)) return;

    // compute neighbours in the *new* list (excluding dragged)
    const listWithoutDragged = targetList.filter((i) => i.id !== dragged.id);
    const overIndex = listWithoutDragged.findIndex((i) => i.id === over.id);
    let beforeId: string | null = null;
    let afterId: string | null = null;
    let newOrder: string;

    if (overIndex === -1) {
      // append to end
      const last = listWithoutDragged[listWithoutDragged.length - 1];
      beforeId = last?.id ?? null;
      afterId = null;
      newOrder = orderBetween(last?.order ?? null, null);
    } else {
      // insert at over's position (before it)
      const prev = listWithoutDragged[overIndex - 1];
      const next = listWithoutDragged[overIndex];
      beforeId = prev?.id ?? null;
      afterId = next?.id ?? null;
      newOrder = orderBetween(prev?.order ?? null, next.order);
    }

    // optimistic update
    setIssues((prev) =>
      prev.map((i) =>
        i.id === dragged.id ? { ...i, statusId: targetStatusId, order: newOrder } : i,
      ),
    );

    startTransition(() => {
      void persistMove(dragged.id, targetStatusId, beforeId, afterId);
    });
  }

  /** Accessible alternative to drag & drop. */
  function moveToStatus(issue: BoardIssue, statusId: string) {
    if (!canEdit || statusId === issue.statusId) return;
    const targetList = [...(byStatus.get(statusId) ?? [])];
    const last = targetList[targetList.length - 1];
    const newOrder = orderBetween(last?.order ?? null, null);
    setIssues((prev) =>
      prev.map((i) => (i.id === issue.id ? { ...i, statusId, order: newOrder } : i)),
    );
    startTransition(() => {
      void persistMove(issue.id, statusId, last?.id ?? null, null);
    });
  }

  const hasFilters =
    assigneeFilter.length > 0 || typeFilter.length > 0 || priorityFilter.length > 0;

  return (
    <BoardStatusesProvider statuses={statuses}>
      <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 md:px-6">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="فیلتر برد…"
            className="h-8 w-44 text-xs"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={hasFilters ? "secondary" : "ghost"} size="sm">
                <Filter /> فیلترها
                {hasFilters && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                    {toPersianDigits(assigneeFilter.length + typeFilter.length + priorityFilter.length)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <FilterGroup
                title="مسئول"
                options={members.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))}
                selected={assigneeFilter}
                onChange={setAssigneeFilter}
              />
              <FilterGroup
                title="نوع"
                options={[
                  { id: "STORY", label: "داستان" },
                  { id: "TASK", label: "وظیفه" },
                  { id: "BUG", label: "باگ" },
                  { id: "EPIC", label: "اپیک" },
                ]}
                selected={typeFilter}
                onChange={setTypeFilter}
              />
              <FilterGroup
                title="اولویت"
                options={[
                  { id: "LOW", label: "کم" },
                  { id: "MEDIUM", label: "متوسط" },
                  { id: "HIGH", label: "بالا" },
                  { id: "CRITICAL", label: "بحرانی" },
                ]}
                selected={priorityFilter}
                onChange={setPriorityFilter}
              />
            </PopoverContent>
          </Popover>
          {sprintName && (
            <span className="mr-auto text-xs text-muted-foreground">{sprintName}</span>
          )}
          <span className={cn("text-xs text-muted-foreground", !sprintName && "mr-auto")}>
            {toPersianDigits(filtered.length)} وظیفه
          </span>
        </div>

        {/* Columns */}
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6">
          <div className="flex h-full min-w-max gap-3">
            {statuses.map((status) => {
              const list = byStatus.get(status.id) ?? [];
              return (
                <BoardColumn
                  key={status.id}
                  status={status}
                  issues={list}
                  canEdit={canEdit}
                  onOpenIssue={(key) => router.push(`/issue/${key}`)}
                  onMoveToStatus={moveToStatus}
                />
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activeIssue && (
          <div className="w-64 rotate-2 opacity-90">
            <IssueCardStatic issue={activeIssue} />
          </div>
        )}
      </DragOverlay>
      </DndContext>
    </BoardStatusesProvider>
  );
}

function BoardColumn({
  status,
  issues,
  canEdit,
  onOpenIssue,
  onMoveToStatus,
}: {
  status: BoardStatus;
  issues: BoardIssue[];
  canEdit: boolean;
  onOpenIssue: (key: string) => void;
  onMoveToStatus: (issue: BoardIssue, statusId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${status.id}`,
    data: { type: "column", statusId: status.id },
  });

  return (
    <section
      aria-label={`ستون ${status.name}`}
      className={cn(
        "flex h-full w-72 flex-col rounded-xl bg-secondary/40 transition-colors",
        isOver && "bg-primary/10 ring-1 ring-primary/40",
      )}
    >
      <header className="flex items-center gap-2 px-3 pb-1 pt-3">
        <StatusDot category={status.category} />
        <h2 className="text-xs font-semibold">{status.name}</h2>
        <span className="text-[11px] text-muted-foreground">
          {toPersianDigits(issues.length)}
        </span>
      </header>

      <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex min-h-24 flex-1 flex-col gap-1.5 overflow-y-auto p-2"
        >
          {issues.map((issue) => (
            <IssueCardWithMenu
              key={issue.id}
              issue={issue}
              canEdit={canEdit}
              onOpen={() => onOpenIssue(issue.key)}
              onMoveToStatus={onMoveToStatus}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

function IssueCardWithMenu({
  issue,
  canEdit,
  onOpen,
  onMoveToStatus,
}: {
  issue: BoardIssue;
  canEdit: boolean;
  onOpen: () => void;
  onMoveToStatus: (issue: BoardIssue, statusId: string) => void;
}) {
  const { statuses } = useBoardStatuses();
  return (
    <div className="group/card relative">
      <IssueCard issue={issue} onOpen={onOpen} />
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-1.5 left-1.5 z-[1] rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover/card:opacity-100"
              aria-label="گزینه‌های وظیفه"
            >
              <Plus className="size-3 rotate-45" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>انتقال به</DropdownMenuLabel>
            {statuses
              .filter((s) => s.id !== issue.statusId)
              .map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => onMoveToStatus(issue, s.id)}>
                  <StatusDot category={s.category} /> {s.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// context giving cards access to statuses without prop drilling
const BoardStatusesContext = createContext<{ statuses: BoardStatus[] }>({ statuses: [] });
function useBoardStatuses() {
  return useContext(BoardStatusesContext);
}

export function BoardStatusesProvider({
  statuses,
  children,
}: {
  statuses: BoardStatus[];
  children: React.ReactNode;
}) {
  return (
    <BoardStatusesContext.Provider value={{ statuses }}>
      {children}
    </BoardStatusesContext.Provider>
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

function FilterGroup({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }
  return (
    <div className="mb-2 last:mb-0">
      <p className="mb-1 px-1 text-[11px] font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
              selected.includes(opt.id)
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border hover:bg-secondary",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
