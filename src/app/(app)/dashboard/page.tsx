import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bug,
  CheckCircle2,
  ClipboardList,
  Target,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { IssueTypeIcon } from "@/components/issues/issue-type-icon";
import { PriorityIcon } from "@/components/issues/priority-icon";
import { formatJalali, formatRelative, toPersianDigits } from "@/lib/jalali";

export default async function DashboardPage() {
  const user = await requireUser();

  const visibleProjects =
    user.role === "OWNER"
      ? await prisma.project.findMany({ where: { state: "ACTIVE" }, select: { id: true, key: true, name: true, icon: true } })
      : await prisma.project.findMany({
          where: { state: "ACTIVE", members: { some: { userId: user.id } } },
          select: { id: true, key: true, name: true, icon: true },
        });
  const projectIds = visibleProjects.map((p) => p.id);

  const [myOpenIssues, overdueIssues, activeSprints, recentActivity, totals] =
    await Promise.all([
      prisma.issue.findMany({
        where: {
          assigneeId: user.id,
          status: { category: { not: "DONE" } },
          projectId: { in: projectIds },
        },
        select: {
          id: true, key: true, title: true, type: true, priority: true, dueAt: true,
          project: { select: { key: true, name: true } },
          status: { select: { name: true } },
        },
        orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
        take: 7,
      }),
      prisma.issue.findMany({
        where: {
          projectId: { in: projectIds },
          dueAt: { lt: new Date() },
          status: { category: { not: "DONE" } },
        },
        select: {
          id: true, key: true, title: true, type: true, priority: true, dueAt: true,
          assignee: { select: { firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 5,
      }),
      prisma.sprint.findMany({
        where: { projectId: { in: projectIds }, state: "ACTIVE" },
        select: {
          id: true, name: true, goal: true, startDate: true, endDate: true,
          project: { select: { key: true, name: true, icon: true } },
          issues: {
            select: { storyPoints: true, status: { select: { category: true } }, id: true },
          },
        },
      }),
      prisma.activityLog.findMany({
        where: { projectId: { in: projectIds }, kind: { not: "UPDATED" } },
        select: {
          id: true, kind: true, createdAt: true,
          user: { select: { firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
          issue: { select: { key: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      Promise.all([
        prisma.issue.count({ where: { projectId: { in: projectIds } } }),
        prisma.issue.count({ where: { projectId: { in: projectIds }, status: { category: "DONE" } } }),
        prisma.issue.count({ where: { projectId: { in: projectIds }, type: "BUG", status: { category: { not: "DONE" } } } }),
      ]),
    ]);

  const [totalIssues, doneIssues, openBugs] = totals;
  const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

  const stats = [
    { label: "کل وظایف", value: toPersianDigits(totalIssues), icon: ClipboardList, color: "text-sky-500" },
    { label: "انجام شده", value: toPersianDigits(doneIssues), icon: CheckCircle2, color: "text-success" },
    { label: "باگ‌های باز", value: toPersianDigits(openBugs), icon: Bug, color: "text-red-500" },
    { label: "نرخ تکمیل", value: `${toPersianDigits(completionRate)}٪`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">داشبورد</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          خلاصه وضعیت تیم‌ها و پروژه‌ها — {formatJalali(new Date(), "fullWeekday")}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`size-4 ${s.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active sprints */}
        <section className="lg:col-span-2 space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Target className="size-4 text-primary" /> اسپرینت‌های فعال
          </h2>
          {activeSprints.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              اسپرینت فعالی وجود ندارد.
            </div>
          )}
          {activeSprints.map((sprint) => {
            const totalPoints = sprint.issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
            const donePoints = sprint.issues
              .filter((i) => i.status?.category === "DONE")
              .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
            const doneCount = sprint.issues.filter((i) => i.status?.category === "DONE").length;
            const pct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
            return (
              <Link
                key={sprint.id}
                href={`/projects/${sprint.project.key}/board`}
                className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span>{sprint.project.icon}</span>
                  <span className="font-medium">{sprint.name}</span>
                  <span className="text-xs text-muted-foreground">· {sprint.project.name}</span>
                  <Badge variant={pct >= 80 ? "success" : pct >= 40 ? "primary" : "warning"} className="mr-auto">
                    {toPersianDigits(pct)}٪ پیشرفت
                  </Badge>
                </div>
                {sprint.goal && (
                  <p className="mt-1 text-xs text-muted-foreground">هدف: {sprint.goal}</p>
                )}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>
                    امتیاز: {toPersianDigits(donePoints)} / {toPersianDigits(totalPoints)}
                  </span>
                  <span>
                    وظایف: {toPersianDigits(doneCount)} / {toPersianDigits(sprint.issues.length)}
                  </span>
                  {sprint.endDate && (
                    <span>پایان: {formatJalali(sprint.endDate)}</span>
                  )}
                </div>
              </Link>
            );
          })}

          {/* My tasks */}
          <h2 className="flex items-center gap-1.5 pt-2 text-sm font-semibold">
            <ClipboardList className="size-4 text-primary" /> کارهای من
          </h2>
          {myOpenIssues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              وظیفه بازی ندارید. عالی! 🎉
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {myOpenIssues.map((issue) => {
                const overdue = issue.dueAt && issue.dueAt < new Date();
                return (
                  <li key={issue.id}>
                    <Link
                      href={`/issue/${issue.key}`}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-secondary/50"
                    >
                      <IssueTypeIcon type={issue.type} />
                      <span dir="ltr" className="font-mono text-[11px] text-muted-foreground">
                        {issue.key}
                      </span>
                      <span className="truncate">{issue.title}</span>
                      {overdue && <AlertTriangle className="size-3.5 shrink-0 text-destructive" />}
                      <span className="mr-auto flex shrink-0 items-center gap-2">
                        <Badge variant="outline">{issue.status?.name}</Badge>
                        <PriorityIcon priority={issue.priority} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Side column */}
        <aside className="space-y-6">
          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <AlertTriangle className="size-4 text-warning" /> عقب‌افتاده
            </h2>
            {overdueIssues.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                هیچ وظیفه‌ای عقب نیفتاده است.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {overdueIssues.map((issue) => (
                  <li key={issue.id}>
                    <Link
                      href={`/issue/${issue.key}`}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs transition-colors hover:border-destructive/40"
                    >
                      <IssueTypeIcon type={issue.type} />
                      <span dir="ltr" className="font-mono text-[10px] text-muted-foreground">{issue.key}</span>
                      <span className="truncate">{issue.title}</span>
                      {issue.assignee && (
                        <Avatar {...issue.assignee} size="xs" className="mr-auto" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold">فعالیت اخیر</h2>
            <ol className="space-y-2.5">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-xs leading-5">
                  <Avatar {...a.user} size="xs" />
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{a.user.firstName} {a.user.lastName}</span>{" "}
                    {activityLabel(a.kind)}{" "}
                    {a.issue && (
                      <Link href={`/issue/${a.issue.key}`} className="text-primary hover:underline">
                        {a.issue.title}
                      </Link>
                    )}
                    <time className="block text-[10px] opacity-70">{formatRelative(a.createdAt)}</time>
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <Link
            href="/my-work"
            className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            مشاهده همه کارهای من <ArrowLeft className="size-4" />
          </Link>
        </aside>
      </div>
    </div>
  );
}

function activityLabel(kind: string): string {
  switch (kind) {
    case "CREATED": return "وظیفه‌ای ایجاد کرد:";
    case "STATUS_CHANGED": return "وضعیت وظیفه را تغییر داد:";
    case "ASSIGNED": return "مسئول وظیفه را عوض کرد:";
    case "COMMENTED": return "در وظیفه کامنت گذاشت:";
    case "TIME_LOGGED": return "زمان ثبت کرد:";
    case "POINTS_CHANGED": return "استوری پوینت را تغییر داد:";
    case "PRIORITY_CHANGED": return "اولویت را تغییر داد:";
    case "MOVED_SPRINT": return "وظیفه را جابه‌جا کرد:";
    default: return "بروزرسانی کرد:";
  }
}
