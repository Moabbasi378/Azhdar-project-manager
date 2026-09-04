import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { buildSprintReport } from "@/lib/sprint-report";
import { SprintReportView } from "@/components/sprints/sprint-report-view";

export const metadata = { title: "گزارش اسپرینت" };

export default async function SprintReportPage({
  params,
}: {
  params: Promise<{ key: string; sprintId: string }>;
}) {
  const user = await requireUser();
  const { key, sprintId } = await params;

  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) notFound();
  const access = await getProjectAccess(user, project.id);
  if (!access) notFound();

  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId: project.id },
    select: {
      id: true,
      name: true,
      goal: true,
      state: true,
      startDate: true,
      endDate: true,
      issues: {
        orderBy: [{ status: { order: "asc" } }, { key: "asc" }],
        select: {
          id: true,
          key: true,
          title: true,
          type: true,
          priority: true,
          storyPoints: true,
          parentId: true,
          completedAt: true,
          dueAt: true,
          createdAt: true,
          estimatedMinutes: true,
          loggedMinutes: true,
          status: { select: { id: true, name: true, category: true } },
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarColor: true,
              avatarImage: true,
              avatarIcon: true,
            },
          },
        },
      },
    },
  });
  if (!sprint) notFound();

  const report = buildSprintReport({ sprint, issues: sprint.issues });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="print:hidden">
        <Link
          href={`/projects/${project.key}/sprints`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          بازگشت به اسپرینت‌ها
        </Link>
      </div>

      <SprintReportView report={report} projectKey={project.key} />
    </div>
  );
}
