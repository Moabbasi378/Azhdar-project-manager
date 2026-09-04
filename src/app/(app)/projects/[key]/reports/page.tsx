import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { ReportsView, type BurndownSprint, type VelocityPoint } from "@/components/reports/reports-view";

export const metadata = { title: "گزارش‌ها" };

const DAY = 86_400_000;

export default async function ProjectReportsPage({
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
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true, name: true, state: true, startDate: true, endDate: true,
      issues: {
        select: {
          storyPoints: true,
          parentId: true,
          completedAt: true,
          status: { select: { category: true } },
        },
      },
    },
  });

  const burndown: Record<string, { day: string; ideal: number; actual: number | null }[]> = {};
  const burndownUnit: Record<string, "POINTS" | "ISSUES"> = {};
  for (const sprint of sprints) {
    if (!sprint.startDate || !sprint.endDate) continue;
    const topIssues = sprint.issues.filter((i) => !i.parentId);
    if (topIssues.length === 0) continue;

    // sprints without story points still get a burndown, counted in issues
    const usePoints = topIssues.some((i) => typeof i.storyPoints === "number");
    const unitOf = (i: (typeof topIssues)[number]) => (usePoints ? i.storyPoints ?? 0 : 1);
    const total = topIssues.reduce((sum, i) => sum + unitOf(i), 0);
    if (total === 0) continue;

    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY));
    const today = new Date();
    const lastDay =
      sprint.state === "COMPLETED" || end < today
        ? Math.min(totalDays, Math.ceil((end.getTime() - start.getTime()) / DAY))
        : Math.max(0, Math.floor((today.getTime() - start.getTime()) / DAY));

    // work completed per absolute day offset
    const doneByOffset = new Map<number, number>();
    for (const issue of topIssues) {
      if (issue.status?.category !== "DONE" || !issue.completedAt) continue;
      const offset = Math.max(
        0,
        Math.min(totalDays, Math.floor((issue.completedAt.getTime() - start.getTime()) / DAY)),
      );
      doneByOffset.set(offset, (doneByOffset.get(offset) ?? 0) + unitOf(issue));
    }

    const series: { day: string; ideal: number; actual: number | null }[] = [];
    let cumulativeDone = 0;
    for (let d = 0; d <= totalDays; d++) {
      const ideal = Math.max(0, Math.round(((totalDays - d) / totalDays) * total));
      let actual: number | null = null;
      if (d <= lastDay) {
        cumulativeDone += doneByOffset.get(d) ?? 0;
        actual = total - cumulativeDone;
      }
      series.push({ day: String(d), ideal, actual });
    }
    burndown[sprint.id] = series;
    burndownUnit[sprint.id] = usePoints ? "POINTS" : "ISSUES";
  }

  // fall back to issue counts when no sprint in the project uses story points
  const velocityUsesPoints = sprints.some((s) =>
    s.issues.some((i) => !i.parentId && typeof i.storyPoints === "number"),
  );
  const velocity: VelocityPoint[] = sprints
    .filter((s) => s.state === "COMPLETED")
    .reverse()
    .map((s) => {
      const topIssues = s.issues.filter((i) => !i.parentId);
      const unitOf = (i: (typeof topIssues)[number]) =>
        velocityUsesPoints ? i.storyPoints ?? 0 : 1;
      return {
        name: s.name,
        committed: topIssues.reduce((sum, i) => sum + unitOf(i), 0),
        completed: topIssues
          .filter((i) => i.status?.category === "DONE")
          .reduce((sum, i) => sum + unitOf(i), 0),
      };
    });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <h1 className="text-lg font-bold">گزارش‌های پروژه</h1>
      <ReportsView
        sprints={sprints.map((s) => ({
          id: s.id,
          name: s.name,
          state: s.state as BurndownSprint["state"],
          startDate: s.startDate?.toISOString() ?? null,
          endDate: s.endDate?.toISOString() ?? null,
        }))}
        burndown={burndown}
        burndownUnit={burndownUnit}
        velocity={velocity}
        velocityUnit={velocityUsesPoints ? "POINTS" : "ISSUES"}
      />
    </div>
  );
}
