import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { EpicsView } from "@/components/epics/epics-view";

export const metadata = { title: "اپیک‌ها" };

export default async function EpicsPage({
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

  const epics = await prisma.issue.findMany({
    where: { projectId: project.id, type: "EPIC" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, key: true, title: true, description: true,
      children: {
        select: {
          id: true, key: true, title: true, type: true, priority: true,
          status: { select: { name: true, category: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  return (
    <EpicsView
      projectId={project.id}
      epics={epics.map((e) => ({
        id: e.id,
        key: e.key,
        title: e.title,
        description: e.description,
        issues: e.children.map((c) => ({
          ...c,
          statusName: c.status?.name ?? "—",
          done: c.status?.category === "DONE",
        })),
      }))}
      canEdit={user.role !== "VIEWER" && access.projectRole !== "VIEWER"}
    />
  );
}
