import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { ProjectTabs } from "@/components/projects/project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
  const user = await requireUser();
  const { key } = await params;

  const project = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
  if (!project) notFound();

  const access = await getProjectAccess(user, project.id);
  if (!access) notFound();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 pt-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{project.icon}</span>
          <h1 className="text-lg font-bold">{project.name}</h1>
          <span dir="ltr" className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {project.key}
          </span>
        </div>
        <ProjectTabs projectKey={project.key} isAdmin={user.role === "OWNER" || access.projectRole === "ADMIN"} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
