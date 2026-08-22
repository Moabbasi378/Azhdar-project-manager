import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { IssueTypeIcon } from "@/components/issues/issue-type-icon";
import { PriorityIcon } from "@/components/issues/priority-icon";
import { formatJalali, toPersianDigits } from "@/lib/jalali";

export const metadata = { title: "کارهای من" };

export default async function MyWorkPage() {
  const user = await requireUser();

  const issues = await prisma.issue.findMany({
    where: {
      assigneeId: user.id,
      status: { category: { not: "DONE" } },
      project: { state: "ACTIVE" },
    },
    select: {
      id: true, key: true, title: true, type: true, priority: true,
      dueAt: true, createdAt: true, updatedAt: true,
      storyPoints: true,
      project: { select: { key: true, name: true, icon: true } },
      sprint: { select: { name: true, state: true } },
      status: { select: { name: true, category: true } },
    },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
  });

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000);

  const groups = [
    {
      id: "overdue",
      title: "عقب‌افتاده",
      icon: <AlertTriangle className="size-4 text-destructive" />,
      items: issues.filter((i) => i.dueAt && i.dueAt < now),
    },
    {
      id: "today",
      title: "امروز",
      icon: <CalendarClock className="size-4 text-warning" />,
      items: issues.filter((i) => i.dueAt && i.dueAt >= now && i.dueAt <= endOfToday),
    },
    {
      id: "week",
      title: "این هفته",
      icon: <CalendarClock className="size-4 text-sky-500" />,
      items: issues.filter(
        (i) => i.dueAt && i.dueAt > endOfToday && i.dueAt <= weekEnd,
      ),
    },
    {
      id: "no-date",
      title: "بدون تاریخ",
      icon: <Inbox className="size-4 text-muted-foreground" />,
      items: issues.filter((i) => !i.dueAt),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">کارهای من</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {toPersianDigits(issues.length)} وظیفه باز به شما اختصاص دارد
        </p>
      </div>

      {issues.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-success" />
          <p className="font-medium">همه چیز انجام شده!</p>
          <p className="mt-1 text-sm text-muted-foreground">وظیفه بازی ندارید.</p>
        </div>
      )}

      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.id}>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                {group.icon} {group.title}
                <span className="text-xs font-normal text-muted-foreground">
                  ({toPersianDigits(group.items.length)})
                </span>
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {group.items.map((issue) => (
                  <li key={issue.id}>
                    <Link
                      href={`/issue/${issue.key}`}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-secondary/50"
                    >
                      <IssueTypeIcon type={issue.type} />
                      <span dir="ltr" className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {issue.key}
                      </span>
                      <span className="truncate">{issue.title}</span>
                      <span className="mr-auto flex shrink-0 items-center gap-2">
                        {issue.storyPoints !== null && (
                          <Badge variant="primary">{toPersianDigits(issue.storyPoints)}</Badge>
                        )}
                        {issue.dueAt && (
                          <time className={`text-[11px] ${group.id === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                            {formatJalali(issue.dueAt)}
                          </time>
                        )}
                        <PriorityIcon priority={issue.priority} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}

      {/* Recently completed */}
      <CompletedSection userId={user.id} />
    </div>
  );
}

async function CompletedSection({ userId }: { userId: string }) {
  const completed = await prisma.issue.findMany({
    where: { assigneeId: userId, status: { category: "DONE" } },
    select: {
      id: true, key: true, title: true, type: true, completedAt: true,
      project: { select: { key: true, name: true } },
    },
    orderBy: { completedAt: "desc" },
    take: 8,
  });

  if (completed.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <CircleDashed className="size-4 text-success" /> اخیراً تکمیل شده
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {completed.map((issue) => (
          <li key={issue.id}>
            <Link
              href={`/issue/${issue.key}`}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/50"
            >
              <CheckCircle2 className="size-3.5 shrink-0 text-success" />
              <span dir="ltr" className="font-mono text-[11px]">{issue.key}</span>
              <span className="truncate line-through">{issue.title}</span>
              {issue.completedAt && (
                <time className="mr-auto shrink-0 text-[11px]">{formatJalali(issue.completedAt)}</time>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
