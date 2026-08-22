import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { IssuesFilterBar } from "@/components/issues/issues-filter-bar";
import { IssueTypeIcon } from "@/components/issues/issue-type-icon";
import { PriorityIcon } from "@/components/issues/priority-icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toPersianDigits, formatJalali } from "@/lib/jalali";

export const metadata = { title: "وظایف" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { key } = await params;
  const sp = await searchParams;

  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) notFound();
  const access = await getProjectAccess(user, project.id);
  if (!access) notFound();

  const filters = {
    q: first(sp.q),
    type: first(sp.type),
    statusId: first(sp.statusId),
    assigneeId: first(sp.assigneeId),
    priority: first(sp.priority),
    epicId: first(sp.epicId),
    sprintId: first(sp.sprintId),
  };

  const [statuses, members, epics, sprints, savedFilters] = await Promise.all([
    prisma.projectStatus.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.projectMember.findMany({
      where: { projectId: project.id },
      select: { user: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.issue.findMany({
      where: { projectId: project.id, type: "EPIC" },
      select: { id: true, key: true, title: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sprint.findMany({
      where: { projectId: project.id },
      select: { id: true, name: true, state: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.savedFilter.findMany({
      where: { userId: user.id, projectId: project.id },
      select: { id: true, name: true, filters: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const where = {
    projectId: project.id,
    ...(filters.q ? { OR: [{ title: { contains: filters.q } }, { key: { contains: filters.q.toUpperCase() } }] } : {}),
    ...(filters.type ? { type: filters.type as "EPIC" | "STORY" | "TASK" | "BUG" | "SUBTASK" } : {}),
    ...(filters.statusId ? { statusId: filters.statusId } : {}),
    ...(filters.assigneeId === "unassigned"
      ? { assigneeId: null }
      : filters.assigneeId
        ? { assigneeId: filters.assigneeId }
        : {}),
    ...(filters.priority
      ? { priority: filters.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }
      : {}),
    ...(filters.epicId ? { epicId: filters.epicId } : {}),
    ...(filters.sprintId === "backlog"
      ? { sprintId: null }
      : filters.sprintId
        ? { sprintId: filters.sprintId }
        : {}),
  };

  const issues = await prisma.issue.findMany({
    where,
    select: {
      id: true, key: true, title: true, type: true, priority: true,
      storyPoints: true, dueAt: true,
      status: { select: { name: true, category: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
      labels: { select: { label: { select: { id: true, name: true, color: true } } } },
    },
    orderBy: [{ status: { order: "asc" } }, { priority: "desc" }],
    take: 200,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <IssuesFilterBar
        projectKey={project.key}
        filters={filters}
        statuses={statuses}
        members={members.map((m) => m.user)}
        epics={epics}
        sprints={sprints}
        savedFilters={savedFilters.map((f) => ({
          id: f.id,
          name: f.name,
          filters: f.filters as Record<string, string>,
        }))}
        projectId={project.id}
      />

      <p className="text-xs text-muted-foreground">
        {toPersianDigits(issues.length)} وظیفه یافت شد
      </p>

      {issues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          وظیفه‌ای با این فیلترها پیدا نشد.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Link
                href={`/issue/${issue.key}`}
                className="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-secondary/50"
              >
                <IssueTypeIcon type={issue.type} />
                <span dir="ltr" className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {issue.key}
                </span>
                <span className="min-w-0 truncate">{issue.title}</span>
                <span className="mr-auto flex shrink-0 items-center gap-2">
                  {issue.labels.slice(0, 2).map(({ label }) => (
                    <Badge key={label.id} variant="outline" className="hidden sm:inline-flex">
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </Badge>
                  ))}
                  {issue.storyPoints !== null && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                      {toPersianDigits(issue.storyPoints)}
                    </span>
                  )}
                  {issue.dueAt && (
                    <span className="hidden text-[11px] text-muted-foreground md:inline">
                      {formatJalali(issue.dueAt)}
                    </span>
                  )}
                  {issue.status && (
                    <Badge
                      variant={
                        issue.status.category === "DONE"
                          ? "success"
                          : issue.status.category === "IN_PROGRESS"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {issue.status.name}
                    </Badge>
                  )}
                  <PriorityIcon priority={issue.priority} />
                  {issue.assignee ? (
                    <Avatar {...issue.assignee} size="xs" />
                  ) : (
                    <span className="size-5 rounded-full border border-dashed border-input" />
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
