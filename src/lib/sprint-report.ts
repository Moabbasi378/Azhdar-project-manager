import { formatJalali } from "@/lib/jalali";
import type {
  IssueType,
  Priority,
  SprintState,
  StatusCategory,
} from "@/generated/prisma/client";

const DAY = 86_400_000;

export type ReportUser = {
  id: string;
  firstName: string;
  lastName: string;
  avatarColor: string;
  avatarImage: string | null;
  avatarIcon: string | null;
};

export type ReportIssue = {
  id: string;
  key: string;
  title: string;
  type: IssueType;
  priority: Priority;
  storyPoints: number | null;
  statusName: string | null;
  statusCategory: StatusCategory | null;
  completedAt: string | null;
  dueAt: string | null;
  assignee: ReportUser | null;
};

export type StatusSlice = {
  id: string;
  name: string;
  category: StatusCategory | null;
  count: number;
  points: number;
};

export type AssigneeSlice = {
  user: ReportUser | null;
  total: number;
  done: number;
  points: number;
  donePoints: number;
};

export type BurndownPoint = {
  day: number;
  label: string;
  ideal: number;
  actual: number | null;
};

export type SprintReport = {
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    state: SprintState;
    startDate: string | null;
    endDate: string | null;
  };
  /** true when at least one issue in the sprint has story points. */
  hasPoints: boolean;
  /** issues that have no story points (only meaningful when hasPoints). */
  pointsMissing: number;
  totals: {
    issues: number;
    done: number;
    remaining: number;
    points: number;
    donePoints: number;
    remainingPoints: number;
  };
  completion: { byCount: number; byPoints: number | null };
  /** "POINTS" when the sprint has story points, otherwise "ISSUES". */
  burndownMetric: "POINTS" | "ISSUES";
  burndown: BurndownPoint[];
  statusBreakdown: StatusSlice[];
  assignees: AssigneeSlice[];
  completed: ReportIssue[];
  remaining: ReportIssue[];
  subtasks: { total: number; done: number };
  time: { estimatedMinutes: number; loggedMinutes: number };
};

export type SprintReportInput = {
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    state: SprintState;
    startDate: Date | null;
    endDate: Date | null;
  };
  issues: {
    id: string;
    key: string;
    title: string;
    type: IssueType;
    priority: Priority;
    storyPoints: number | null;
    parentId: string | null;
    completedAt: Date | null;
    dueAt: Date | null;
    createdAt: Date;
    estimatedMinutes: number | null;
    loggedMinutes: number;
    status: { id: string; name: string; category: StatusCategory } | null;
    assignee: ReportUser | null;
  }[];
};

function metricOf(
  issue: { storyPoints: number | null },
  usePoints: boolean,
): number {
  return usePoints ? issue.storyPoints ?? 0 : 1;
}

function isDone(issue: {
  status: { category: StatusCategory } | null;
}): boolean {
  return issue.status?.category === "DONE";
}

/**
 * Builds a full sprint report. Works with or without story points: when no
 * issue carries story points every metric falls back to issue counts so the
 * report is never empty.
 */
export function buildSprintReport({ sprint, issues }: SprintReportInput): SprintReport {
  const subtasks = issues.filter((i) => i.parentId);
  const scoped = issues.filter((i) => !i.parentId);

  const hasPoints = scoped.some((i) => typeof i.storyPoints === "number");
  const pointsMissing = scoped.filter((i) => typeof i.storyPoints !== "number").length;

  const done = scoped.filter(isDone);
  const remaining = scoped.filter((i) => !isDone(i));

  const points = scoped.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const donePoints = done.reduce((s, i) => s + (i.storyPoints ?? 0), 0);

  const totals = {
    issues: scoped.length,
    done: done.length,
    remaining: remaining.length,
    points,
    donePoints,
    remainingPoints: points - donePoints,
  };

  const completion = {
    byCount: scoped.length ? Math.round((done.length / scoped.length) * 100) : 0,
    byPoints: hasPoints && points > 0 ? Math.round((donePoints / points) * 100) : null,
  };

  // ── status breakdown ────────────────────────────────────────────
  const statusMap = new Map<string, StatusSlice>();
  for (const issue of scoped) {
    const id = issue.status?.id ?? "__none__";
    const slice =
      statusMap.get(id) ??
      ({
        id,
        name: issue.status?.name ?? "بدون وضعیت",
        category: issue.status?.category ?? null,
        count: 0,
        points: 0,
      } satisfies StatusSlice);
    slice.count += 1;
    slice.points += issue.storyPoints ?? 0;
    statusMap.set(id, slice);
  }
  const statusBreakdown = [...statusMap.values()].sort((a, b) => b.count - a.count);

  // ── assignee breakdown ──────────────────────────────────────────
  const assigneeMap = new Map<string, AssigneeSlice>();
  for (const issue of scoped) {
    const id = issue.assignee?.id ?? "__none__";
    const slice =
      assigneeMap.get(id) ??
      ({ user: issue.assignee, total: 0, done: 0, points: 0, donePoints: 0 } satisfies AssigneeSlice);
    slice.total += 1;
    slice.points += issue.storyPoints ?? 0;
    if (isDone(issue)) {
      slice.done += 1;
      slice.donePoints += issue.storyPoints ?? 0;
    }
    assigneeMap.set(id, slice);
  }
  const assignees = [...assigneeMap.values()].sort((a, b) => b.total - a.total);

  const toReportIssue = (issue: SprintReportInput["issues"][number]): ReportIssue => ({
    id: issue.id,
    key: issue.key,
    title: issue.title,
    type: issue.type,
    priority: issue.priority,
    storyPoints: issue.storyPoints,
    statusName: issue.status?.name ?? null,
    statusCategory: issue.status?.category ?? null,
    completedAt: issue.completedAt?.toISOString() ?? null,
    dueAt: issue.dueAt?.toISOString() ?? null,
    assignee: issue.assignee,
  });

  return {
    sprint: {
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal,
      state: sprint.state,
      startDate: sprint.startDate?.toISOString() ?? null,
      endDate: sprint.endDate?.toISOString() ?? null,
    },
    hasPoints,
    pointsMissing,
    totals,
    completion,
    burndownMetric: hasPoints ? "POINTS" : "ISSUES",
    burndown: buildBurndown(sprint, scoped, hasPoints),
    statusBreakdown,
    assignees,
    completed: done
      .map(toReportIssue)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    remaining: remaining.map(toReportIssue),
    subtasks: {
      total: subtasks.length,
      done: subtasks.filter(isDone).length,
    },
    time: {
      estimatedMinutes: scoped.reduce((s, i) => s + (i.estimatedMinutes ?? 0), 0),
      loggedMinutes: scoped.reduce((s, i) => s + i.loggedMinutes, 0),
    },
  };
}

/**
 * Remaining-work series for the sprint. Uses story points when available and
 * falls back to the number of open issues, so sprints without story points
 * still get a full chart.
 */
function buildBurndown(
  sprint: SprintReportInput["sprint"],
  scoped: SprintReportInput["issues"],
  usePoints: boolean,
): BurndownPoint[] {
  if (scoped.length === 0) return [];

  const completedDates = scoped
    .filter((i) => isDone(i) && i.completedAt)
    .map((i) => i.completedAt!.getTime());

  const start =
    sprint.startDate ?? new Date(Math.min(...scoped.map((i) => i.createdAt.getTime())));
  const end =
    sprint.endDate ??
    (completedDates.length
      ? new Date(Math.max(...completedDates))
      : new Date(start.getTime() + 14 * DAY));

  const endMs = Math.max(end.getTime(), start.getTime() + DAY);
  const totalDays = Math.max(1, Math.ceil((endMs - start.getTime()) / DAY));

  const totalWork = scoped.reduce((s, i) => s + metricOf(i, usePoints), 0);
  if (totalWork === 0) return [];

  const now = Date.now();
  const lastDay =
    sprint.state === "COMPLETED" || endMs < now
      ? totalDays
      : Math.max(0, Math.floor((now - start.getTime()) / DAY));

  const doneByOffset = new Map<number, number>();
  for (const issue of scoped) {
    if (!isDone(issue) || !issue.completedAt) continue;
    const offset = Math.max(
      0,
      Math.min(totalDays, Math.floor((issue.completedAt.getTime() - start.getTime()) / DAY)),
    );
    doneByOffset.set(offset, (doneByOffset.get(offset) ?? 0) + metricOf(issue, usePoints));
  }

  const series: BurndownPoint[] = [];
  let cumulativeDone = 0;
  for (let d = 0; d <= totalDays; d += 1) {
    const ideal = Math.max(0, Math.round(((totalDays - d) / totalDays) * totalWork));
    let actual: number | null = null;
    if (d <= lastDay) {
      cumulativeDone += doneByOffset.get(d) ?? 0;
      actual = totalWork - cumulativeDone;
    }
    series.push({
      day: d,
      label: formatJalali(new Date(start.getTime() + d * DAY), "dayMonth"),
      ideal,
      actual,
    });
  }
  return series;
}
