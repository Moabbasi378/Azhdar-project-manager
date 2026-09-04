"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Printer,
  Target,
  TriangleAlert,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IssueTypeIcon } from "@/components/issues/issue-type-icon";
import { PriorityIcon } from "@/components/issues/priority-icon";
import { cn, PRIORITY_LABELS } from "@/lib/utils";
import { formatDuration, formatJalali, toPersianDigits } from "@/lib/jalali";
import type { AssigneeSlice, ReportIssue, SprintReport, StatusSlice } from "@/lib/sprint-report";

const STATE_LABEL: Record<SprintReport["sprint"]["state"], string> = {
  ACTIVE: "فعال",
  PLANNED: "برنامه‌ریزی شده",
  COMPLETED: "تکمیل شده",
};

const STATE_VARIANT: Record<
  SprintReport["sprint"]["state"],
  "success" | "outline" | "default"
> = {
  ACTIVE: "success",
  PLANNED: "outline",
  COMPLETED: "default",
};

const CATEGORY_LABEL: Record<string, string> = {
  TODO: "انجام‌نشده",
  IN_PROGRESS: "در حال انجام",
  DONE: "انجام‌شده",
};

const CATEGORY_COLOR: Record<string, string> = {
  TODO: "var(--muted-foreground)",
  IN_PROGRESS: "var(--primary)",
  DONE: "var(--success)",
  NONE: "var(--border)",
};

export function SprintReportView({
  report,
  projectKey,
}: {
  report: SprintReport;
  projectKey: string;
}) {
  const { sprint, totals, completion, hasPoints } = report;
  const metricLabel = report.burndownMetric === "POINTS" ? "امتیاز باقی‌مانده" : "وظیفه باقی‌مانده";
  const percent = completion.byPoints ?? completion.byCount;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Target className="size-5 text-muted-foreground" />
            <h1 className="text-lg font-bold">گزارش {sprint.name}</h1>
            <Badge variant={STATE_VARIANT[sprint.state]}>{STATE_LABEL[sprint.state]}</Badge>
          </div>
          <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
            <Printer /> چاپ
          </Button>
        </div>
        {sprint.goal && <p className="text-sm text-muted-foreground">هدف: {sprint.goal}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(sprint.startDate || sprint.endDate) && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {sprint.startDate ? formatJalali(sprint.startDate) : "—"}
              {" تا "}
              {sprint.endDate ? formatJalali(sprint.endDate) : "—"}
            </span>
          )}
          <Link
            href={`/projects/${projectKey}/board`}
            className="print:hidden hover:text-foreground hover:underline"
          >
            رفتن به برد
          </Link>
        </div>
      </header>

      {!hasPoints && (
        <div className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            هیچ وظیفه‌ای در این اسپرینت استوری پوینت ندارد؛ همه‌ی نمودارها و اعداد بر اساس
            <strong className="mx-1">تعداد وظایف</strong>
            محاسبه شده‌اند.
          </span>
        </div>
      )}
      {hasPoints && report.pointsMissing > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            {toPersianDigits(report.pointsMissing)} وظیفه بدون استوری پوینت هستند و در مجموع امتیازها
            لحاظ نشده‌اند.
          </span>
        </div>
      )}

      {/* Summary cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Circle className="size-4" />}
          label="وظایف اسپرینت"
          value={`${toPersianDigits(totals.done)} / ${toPersianDigits(totals.issues)}`}
          hint={`${toPersianDigits(totals.remaining)} وظیفه باقی‌مانده`}
        />
        <StatCard
          icon={<CheckCircle2 className="size-4" />}
          label="پیشرفت"
          value={`${toPersianDigits(percent)}٪`}
          hint={
            hasPoints && completion.byPoints !== null && completion.byPoints !== completion.byCount
              ? `بر اساس امتیاز · ${toPersianDigits(completion.byCount)}٪ بر اساس تعداد`
              : hasPoints
                ? "بر اساس امتیاز داستان"
                : "بر اساس تعداد وظایف"
          }
        />
        {hasPoints && (
          <StatCard
            icon={<Target className="size-4" />}
            label="امتیاز داستان"
            value={`${toPersianDigits(totals.donePoints)} / ${toPersianDigits(totals.points)}`}
            hint={`${toPersianDigits(totals.remainingPoints)} امتیاز باقی‌مانده`}
          />
        )}
        <StatCard
          icon={<Clock className="size-4" />}
          label="زمان ثبت‌شده"
          value={formatDuration(report.time.loggedMinutes)}
          hint={
            report.time.estimatedMinutes > 0
              ? `برآورد: ${formatDuration(report.time.estimatedMinutes)}`
              : "برآوردی ثبت نشده است"
          }
        />
      </section>

      {totals.issues === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          این اسپرینت هیچ وظیفه‌ای ندارد.
        </p>
      )}

      {/* Burndown */}
      {report.burndown.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold">نمودار برنداون</h2>
          <p className="mb-3 text-xs text-muted-foreground">{metricLabel}</p>
          <div className="rounded-xl border border-border bg-card p-4" dir="ltr">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={report.burndown} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => toPersianDigits(v)}
                  stroke="var(--muted-foreground)"
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value) => toPersianDigits(value as number)}
                  contentStyle={{
                    direction: "rtl",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend
                  formatter={(v) => (
                    <span style={{ fontSize: 12 }}>
                      {v === "ideal" ? "خط ایده‌آل" : "واقعی"}
                    </span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  stroke="var(--muted-foreground)"
                  strokeDasharray="6 4"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Status breakdown */}
      {report.statusBreakdown.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">توزیع وضعیت‌ها</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <StackedBar slices={report.statusBreakdown} total={totals.issues} hasPoints={hasPoints} />
            <ul className="mt-4 space-y-2 text-sm">
              {report.statusBreakdown.map((slice) => (
                <li key={slice.id} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLOR[slice.category ?? "NONE"] }}
                  />
                  <span className="truncate">{slice.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({slice.category ? CATEGORY_LABEL[slice.category] : "بدون دسته"})
                  </span>
                  <span className="mr-auto tabular-nums">
                    {toPersianDigits(slice.count)} وظیفه
                    {hasPoints && ` · ${toPersianDigits(slice.points)} امتیاز`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Assignee breakdown */}
      {report.assignees.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">عملکرد اعضا</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">عضو</th>
                  <th className="px-3 py-2 text-right font-medium">وظایف</th>
                  <th className="px-3 py-2 text-right font-medium">انجام‌شده</th>
                  {hasPoints && <th className="px-3 py-2 text-right font-medium">امتیاز</th>}
                  {hasPoints && <th className="px-3 py-2 text-right font-medium">امتیاز انجام‌شده</th>}
                  <th className="px-3 py-2 text-right font-medium">پیشرفت</th>
                </tr>
              </thead>
              <tbody>
                {report.assignees.map((row) => (
                  <AssigneeRow key={row.user?.id ?? "none"} row={row} hasPoints={hasPoints} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {report.subtasks.total > 0 && (
        <p className="text-xs text-muted-foreground">
          زیر‌وظیفه‌ها: {toPersianDigits(report.subtasks.done)} از{" "}
          {toPersianDigits(report.subtasks.total)} انجام شده‌اند.
        </p>
      )}

      {/* Issue lists */}
      <IssueList
        title={`وظایف انجام‌شده (${toPersianDigits(report.completed.length)})`}
        issues={report.completed}
        hasPoints={hasPoints}
        emptyText="هنوز وظیفه‌ای انجام نشده است."
        defaultOpen={report.completed.length > 0 && report.completed.length <= 12}
      />
      <IssueList
        title={`وظایف باقی‌مانده (${toPersianDigits(report.remaining.length)})`}
        issues={report.remaining}
        hasPoints={hasPoints}
        emptyText="همه‌ی وظایف انجام شده‌اند."
        defaultOpen={report.remaining.length > 0 && report.remaining.length <= 12}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p dir="rtl" className="mt-2 text-xl font-bold tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StackedBar({
  slices,
  total,
  hasPoints,
}: {
  slices: StatusSlice[];
  total: number;
  hasPoints: boolean;
}) {
  const denom = hasPoints ? slices.reduce((s, x) => s + x.points, 0) : total;
  if (denom <= 0) return null;
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
      {slices.map((slice) => {
        const value = hasPoints ? slice.points : slice.count;
        const width = (value / denom) * 100;
        if (width <= 0) return null;
        return (
          <div
            key={slice.id}
            title={`${slice.name}: ${toPersianDigits(slice.count)} وظیفه`}
            style={{ width: `${width}%`, backgroundColor: CATEGORY_COLOR[slice.category ?? "NONE"] }}
          />
        );
      })}
    </div>
  );
}

function AssigneeRow({ row, hasPoints }: { row: AssigneeSlice; hasPoints: boolean }) {
  const percent = row.total ? Math.round((row.done / row.total) * 100) : 0;
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2">
        {row.user ? (
          <span className="flex items-center gap-2">
            <Avatar
              firstName={row.user.firstName}
              lastName={row.user.lastName}
              color={row.user.avatarColor}
              imageUrl={row.user.avatarImage}
              icon={row.user.avatarIcon}
              size="xs"
            />
            {row.user.firstName} {row.user.lastName}
          </span>
        ) : (
          <span className="text-muted-foreground">بدون مسئول</span>
        )}
      </td>
      <td className="px-3 py-2 tabular-nums">{toPersianDigits(row.total)}</td>
      <td className="px-3 py-2 tabular-nums">{toPersianDigits(row.done)}</td>
      {hasPoints && <td className="px-3 py-2 tabular-nums">{toPersianDigits(row.points)}</td>}
      {hasPoints && <td className="px-3 py-2 tabular-nums">{toPersianDigits(row.donePoints)}</td>}
      <td className="px-3 py-2">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
            <span className="block h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {toPersianDigits(percent)}٪
          </span>
        </span>
      </td>
    </tr>
  );
}

function IssueList({
  title,
  issues,
  hasPoints,
  emptyText,
  defaultOpen,
}: {
  title: string;
  issues: ReportIssue[];
  hasPoints: boolean;
  emptyText: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-3 flex w-full items-center gap-2 text-sm font-semibold"
      >
        <span className={cn("transition-transform", open && "rotate-90")}>›</span>
        {title}
      </button>
      {open &&
        (issues.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">وظیفه</th>
                  <th className="px-3 py-2 text-right font-medium">وضعیت</th>
                  <th className="px-3 py-2 text-right font-medium">مسئول</th>
                  {hasPoints && <th className="px-3 py-2 text-right font-medium">امتیاز</th>}
                  <th className="px-3 py-2 text-right font-medium">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Link
                        href={`/issue/${issue.key}`}
                        className="flex items-center gap-2 hover:text-primary hover:underline"
                      >
                        <IssueTypeIcon type={issue.type} />
                        <PriorityIcon priority={issue.priority} />
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {issue.key}
                        </span>
                        <span className="truncate">{issue.title}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {issue.statusName ?? "—"}
                      {issue.statusCategory && (
                        <span className="mr-1 text-muted-foreground">
                          ({CATEGORY_LABEL[issue.statusCategory]})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
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
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    {hasPoints && (
                      <td className="px-3 py-2 tabular-nums">
                        {issue.storyPoints === null ? "—" : toPersianDigits(issue.storyPoints)}
                      </td>
                    )}
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {issue.completedAt
                        ? `انجام: ${formatJalali(issue.completedAt)}`
                        : issue.dueAt
                          ? `سررسید: ${formatJalali(issue.dueAt)}`
                          : "—"}
                      {issue.priority !== "MEDIUM" && (
                        <span className="mr-1">· {PRIORITY_LABELS[issue.priority]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}
