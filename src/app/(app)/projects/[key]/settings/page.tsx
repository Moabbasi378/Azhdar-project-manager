import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { ProjectSettingsView } from "@/components/projects/project-settings-view";

export const metadata = { title: "تنظیمات پروژه" };

export default async function ProjectSettingsPage({
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

  const isAdmin =
    user.role === "OWNER" || (user.role === "PROJECT_MANAGER" && access.projectRole === "ADMIN");
  if (!isAdmin) redirect(`/projects/${project.key}`);

  const statuses = await prisma.projectStatus.findMany({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
    select: { id: true, name: true, category: true, isDefault: true },
  });

  return (
    <ProjectSettingsView
      projectId={project.id}
      projectKey={project.key}
      initial={{
        name: project.name,
        description: project.description ?? "",
        icon: project.icon,
      }}
      statuses={statuses.map((s) => ({
        ...s,
        category: s.category as "TODO" | "IN_PROGRESS" | "DONE",
      }))}
    />
  );
}
