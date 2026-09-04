import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { SprintsView, type SprintRow } from "@/components/sprints/sprints-view";

export const metadata = { title: "اسپرینت‌ها" };

export default async function SprintsPage({
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

  const sprints = await prisma.sprint.findMany({
    where: { projectId: project.id },
    orderBy: [{ state: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      goal: true,
      state: true,
      startDate: true,
      endDate: true,
      issues: {
        select: {
          status: { select: { category: true } },
          storyPoints: true,
          parentId: true,
        },
      },
    },
  });

  const rows: SprintRow[] = sprints.map((s) => {
    const topIssues = s.issues.filter((i) => !i.parentId);
    return {
      id: s.id,
      name: s.name,
      goal: s.goal,
      state: s.state as SprintRow["state"],
      startDate: s.startDate?.toISOString() ?? null,
      endDate: s.endDate?.toISOString() ?? null,
      issueCount: topIssues.length,
      doneCount: topIssues.filter((i) => i.status?.category === "DONE").length,
      points: topIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    };
  });

  return (
    <SprintsView
      projectId={project.id}
      projectKey={project.key}
      initialSprints={rows}
      canManage={user.role !== "VIEWER" && access.projectRole !== "VIEWER"}
    />
  );
}
