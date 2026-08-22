import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { CalendarView, type CalendarIssue } from "@/components/calendar/calendar-view";

export const metadata = { title: "تقویم پروژه" };

export default async function ProjectCalendarPage({
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

  const issues = await prisma.issue.findMany({
    where: {
      projectId: project.id,
      dueAt: { not: null },
      type: { not: "EPIC" },
    },
    select: {
      id: true, key: true, title: true, type: true, priority: true, dueAt: true,
      status: { select: { category: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, avatarColor: true } },
    },
    orderBy: { dueAt: "asc" },
    take: 300,
  });

  const calendarIssues: CalendarIssue[] = issues.map((i) => ({
    id: i.id,
    key: i.key,
    title: i.title,
    type: i.type,
    priority: i.priority,
    dueAt: i.dueAt!.toISOString(),
    done: i.status?.category === "DONE",
    assignee: i.assignee,
  }));

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <CalendarView issues={calendarIssues} />
    </div>
  );
}
