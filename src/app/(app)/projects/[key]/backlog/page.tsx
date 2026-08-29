import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { BacklogView, type BacklogEpic } from "@/components/backlog/backlog-view";
import type { BoardIssue } from "@/components/board/issue-card";

export const metadata = { title: "بک‌لاگ" };

const issueSelect = {
  id: true, key: true, title: true, type: true, priority: true,
  storyPoints: true, order: true, statusId: true, sprintId: true, dueAt: true,
  epicId: true,
  assignee: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
  labels: { select: { label: { select: { id: true, name: true, color: true } } } },
} as const;

export default async function BacklogPage({
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

  const [backlogIssues, sprints, epics] = await Promise.all([
    prisma.issue.findMany({
      where: { projectId: project.id, sprintId: null, type: { not: "EPIC" }, parentId: null },
      select: issueSelect,
      orderBy: { order: "asc" },
    }),
    prisma.sprint.findMany({
      where: { projectId: project.id, state: { not: "COMPLETED" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, goal: true, state: true, startDate: true, endDate: true,
        issues: {
          where: { parentId: null },
          select: issueSelect,
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.issue.findMany({
      where: { projectId: project.id, type: "EPIC" },
      select: { id: true, key: true, title: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <BacklogView
      initialBacklog={backlogIssues as BoardIssue[]}
      initialSprints={sprints.map((s) => ({
        sprint: {
          ...s,
          state: s.state as "PLANNED" | "ACTIVE" | "COMPLETED",
          startDate: s.startDate?.toISOString() ?? null,
          endDate: s.endDate?.toISOString() ?? null,
        },
        issues: s.issues as BoardIssue[],
      }))}
      epics={epics as BacklogEpic[]}
      canEdit={user.role !== "VIEWER" && access.projectRole !== "VIEWER"}
      projectId={project.id}
    />
  );
}
