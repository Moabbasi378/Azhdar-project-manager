import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { IssueDetailBody } from "@/components/issues/issue-detail-body";
import type { IssueMeta, IssueDetail } from "@/lib/issue-types";

export default async function IssuePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const user = await requireUser();
  const { key } = await params;

  const issue = await prisma.issue.findUnique({
    where: { key: key.toUpperCase() },
    include: {
      status: true,
      sprint: { select: { id: true, name: true, state: true } },
      epic: { select: { id: true, key: true, title: true } },
      parent: { select: { id: true, key: true, title: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
      reporter: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
      labels: { select: { label: { select: { id: true, name: true, color: true } } } },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
        },
      },
      timeEntries: {
        orderBy: { workedAt: "desc" },
        select: {
          id: true,
          minutes: true,
          description: true,
          workedAt: true,
          user: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          kind: true,
          field: true,
          oldValue: true,
          newValue: true,
          meta: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
        },
      },
      children: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          key: true,
          title: true,
          status: { select: { name: true, category: true } },
        },
      },
    },
  });
  if (!issue) notFound();

  const access = await getProjectAccess(user, issue.projectId);
  if (!access) notFound();

  const [members, sprints, statuses, labels, epics] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: issue.projectId },
      select: { role: true, user: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } } },
    }),
    prisma.sprint.findMany({
      where: { projectId: issue.projectId, state: { not: "COMPLETED" } },
      select: { id: true, name: true, state: true },
    }),
    prisma.projectStatus.findMany({ where: { projectId: issue.projectId }, orderBy: { order: "asc" } }),
    prisma.label.findMany({ where: { projectId: issue.projectId }, orderBy: { name: "asc" } }),
    prisma.issue.findMany({
      where: { projectId: issue.projectId, type: "EPIC" },
      select: { id: true, key: true, title: true },
    }),
  ]);

  const meta: IssueMeta = {
    members: members.map((m) => ({ ...m.user, memberRole: m.role })),
    sprints,
    statuses,
    labels,
    epics,
    canEdit: user.role !== "VIEWER" && access.projectRole !== "VIEWER",
  };

  const dto: IssueDetail = {
    ...issue,
    startAt: issue.startAt?.toISOString() ?? null,
    dueAt: issue.dueAt?.toISOString() ?? null,
    completedAt: issue.completedAt?.toISOString() ?? null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    comments: issue.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    timeEntries: issue.timeEntries.map((t) => ({
      ...t,
      workedAt: t.workedAt.toISOString(),
    })),
    activities: issue.activities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return (
    <div className="mx-auto w-full">
      <IssueDetailBody data={{ issue: dto, meta }} />
    </div>
  );
}
