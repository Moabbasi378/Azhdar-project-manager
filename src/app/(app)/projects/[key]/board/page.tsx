import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { BoardView, type BoardStatus } from "@/components/board/board-view";
import type { BoardIssue } from "@/components/board/issue-card";

export const metadata = { title: "برد" };

function sevenDaysAgo(): Date {
  return new Date(Date.now() - 7 * 86_400_000);
}

export default async function BoardPage({
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

  const [statuses, activeSprint, members] = await Promise.all([
    prisma.projectStatus.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true, category: true },
    }),
    prisma.sprint.findFirst({
      where: { projectId: project.id, state: "ACTIVE" },
      select: { id: true, name: true },
    }),
    prisma.projectMember.findMany({
      where: { projectId: project.id },
      select: { user: { select: { id: true, firstName: true, lastName: true, avatarColor: true } } },
    }),
  ]);

  // Board shows the active sprint; if none, show all non-done + done recent issues.
  const issues = await prisma.issue.findMany({
    where: {
      projectId: project.id,
      ...(activeSprint
        ? { sprintId: activeSprint.id }
        : {
            OR: [
              { status: { category: { not: "DONE" } } },
              { completedAt: { gte: sevenDaysAgo() } },
            ],
          }),
      parentId: null,
    },
    select: {
      id: true, key: true, title: true, type: true, priority: true,
      storyPoints: true, order: true, statusId: true, sprintId: true, dueAt: true,
      epicId: true,
      assignee: { select: { id: true, firstName: true, lastName: true, avatarColor: true } },
      labels: { select: { label: { select: { id: true, name: true, color: true } } } },
    },
    orderBy: { order: "asc" },
  });

  const boardIssues: BoardIssue[] = issues.map((i) => ({
    ...i,
    dueAt: i.dueAt?.toISOString() ?? null,
  }));

  return (
    <BoardView
      statuses={statuses as BoardStatus[]}
      initialIssues={boardIssues}
      members={members.map((m) => m.user)}
      canEdit={user.role !== "VIEWER" && access.projectRole !== "VIEWER"}
      sprintName={activeSprint?.name}
    />
  );
}
