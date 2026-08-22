import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";
import { TeamView } from "@/components/projects/team-view";

export const metadata = { title: "تیم" };

export default async function TeamPage({
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

  const [members, allUsers] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        user: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
      },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true },
    }),
  ]);

  return (
    <TeamView
      projectId={project.id}
      initialMembers={members.map((m) => ({
        userId: m.user.id,
        role: m.role,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        avatarColor: m.user.avatarColor,
        avatarImage: m.user.avatarImage,
        avatarIcon: m.user.avatarIcon,
      }))}
      allUsers={allUsers}
      canManage={
        user.role === "OWNER" ||
        (user.role === "PROJECT_MANAGER" && access.projectRole === "ADMIN")
      }
    />
  );
}
