import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CalendarView, type CalendarIssue } from "@/components/calendar/calendar-view";

export const metadata = { title: "تقویم" };

export default async function GlobalCalendarPage() {
  const user = await requireUser();

  const visibleProjects =
    user.role === "OWNER"
      ? await prisma.project.findMany({ where: { state: "ACTIVE" }, select: { id: true } })
      : await prisma.project.findMany({
          where: { state: "ACTIVE", members: { some: { userId: user.id } } },
          select: { id: true },
        });

  const issues = await prisma.issue.findMany({
    where: {
      projectId: { in: visibleProjects.map((p) => p.id) },
      dueAt: { not: null },
      type: { not: "EPIC" },
    },
    select: {
      id: true, key: true, title: true, type: true, priority: true, dueAt: true,
      status: { select: { category: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
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
      <h1 className="mb-4 text-xl font-bold">تقویم</h1>
      <CalendarView issues={calendarIssues} />
    </div>
  );
}
