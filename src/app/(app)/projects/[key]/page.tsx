import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ClipboardList, Target, TrendingUp, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatJalali, formatRelative, toPersianDigits } from "@/lib/jalali";
import { PROJECT_ROLE_LABELS } from "@/lib/utils";

export const metadata = { title: "نمای کلی پروژه" };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const user = await requireUser();
  const { key } = await params;

  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) notFound();
  const access = await getProjectAccess(user, project.id);
  if (!access) notFound();

  const [activeSprint, members, activity] = await Promise.all([
    prisma.sprint.findFirst({
      where: { projectId: project.id, state: "ACTIVE" },
      select: {
        id: true, name: true, goal: true, startDate: true, endDate: true,
        issues: {
          where: { parentId: null },
          select: { id: true, storyPoints: true, status: { select: { category: true } } },
        },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        user: { select: { id: true, firstName: true, lastName: true, avatarColor: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { projectId: project.id, kind: { not: "UPDATED" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, kind: true, createdAt: true,
        user: { select: { firstName: true, lastName: true, avatarColor: true } },
        issue: { select: { key: true, title: true } },
      },
    }),
  ]);

  const [totalIssues, doneIssues, inProgressIssues] = await Promise.all([
    prisma.issue.count({ where: { projectId: project.id } }),
    prisma.issue.count({ where: { projectId: project.id, status: { category: "DONE" } } }),
    prisma.issue.count({ where: { projectId: project.id, status: { category: "IN_PROGRESS" } } }),
  ]);
  const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

  const stats = [
    { label: "کل وظایف", value: toPersianDigits(totalIssues), icon: ClipboardList, color: "text-sky-500" },
    { label: "در حال انجام", value: toPersianDigits(inProgressIssues), icon: TrendingUp, color: "text-amber-500" },
    { label: "انجام شده", value: toPersianDigits(doneIssues), icon: CheckCircle2, color: "text-success" },
    { label: "نرخ تکمیل", value: `${toPersianDigits(completionRate)}٪`, icon: Target, color: "text-primary" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}

      {/* Stats */}
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

      {/* Active sprint */}
      {activeSprint && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Target className="size-4 text-success" />
            <h2 className="font-semibold">{activeSprint.name}</h2>
            <Badge variant="success">فعال</Badge>
            {activeSprint.endDate && (
              <span className="mr-auto text-xs text-muted-foreground">
                پایان: {formatJalali(activeSprint.endDate)}
              </span>
            )}
          </div>
          {activeSprint.goal && (
            <p className="mt-1.5 text-sm text-muted-foreground">هدف: {activeSprint.goal}</p>
          )}
          {(() => {
            const totalPoints = activeSprint.issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
            const donePoints = activeSprint.issues
              .filter((i) => i.status?.category === "DONE")
              .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
            const pct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
            return (
              <>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {toPersianDigits(donePoints)} از {toPersianDigits(totalPoints)} امتیاز تکمیل شده
                </p>
              </>
            );
          })()}
          <Link
            href={`/projects/${project.key}/board`}
            className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
          >
            رفتن به برد ←
          </Link>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Members */}
        <section className="lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Users className="size-4 text-primary" /> اعضای تیم
            <span className="text-xs font-normal text-muted-foreground">
              ({toPersianDigits(members.length)})
            </span>
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {members.map((m) => (
              <li key={m.user.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <Avatar {...m.user} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.user.firstName} {m.user.lastName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {PROJECT_ROLE_LABELS[m.role]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href={`/projects/${project.key}/team`}
            className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
          >
            مدیریت تیم ←
          </Link>
        </section>

        {/* Activity */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">فعالیت اخیر</h2>
          {activity.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              فعالیتی ثبت نشده است.
            </p>
          ) : (
            <ol className="space-y-3 rounded-xl border border-border bg-card p-4">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 text-xs leading-5">
                  <Avatar {...a.user} size="xs" />
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {a.user.firstName} {a.user.lastName}
                    </span>{" "}
                    {activityLabel(a.kind)}{" "}
                    {a.issue && (
                      <Link href={`/issue/${a.issue.key}`} className="text-primary hover:underline">
                        {a.issue.title}
                      </Link>
                    )}
                    <time className="mr-1 text-[10px] opacity-70">· {formatRelative(a.createdAt)}</time>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function activityLabel(kind: string): string {
  switch (kind) {
    case "CREATED": return "وظیفه‌ای ایجاد کرد:";
    case "STATUS_CHANGED": return "وضعیت را تغییر داد:";
    case "ASSIGNED": return "مسئول را عوض کرد:";
    case "COMMENTED": return "کامنت گذاشت:";
    case "TIME_LOGGED": return "زمان ثبت کرد:";
    case "POINTS_CHANGED": return "استوری پوینت را تغییر داد:";
    case "PRIORITY_CHANGED": return "اولویت را تغییر داد:";
    case "MOVED_SPRINT": return "جابه‌جا کرد:";
    case "DELETED": return "حذف کرد:";
    default: return "بروزرسانی کرد:";
  }
}
