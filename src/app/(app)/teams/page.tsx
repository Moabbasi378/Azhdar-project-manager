import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { TeamsView } from "@/components/teams/teams-view";

export const metadata = { title: "تیم‌ها" };

export default async function TeamsPage() {
  const user = await requireUser();

  const [teams, allUsers] = await Promise.all([
    prisma.team.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        leader: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
        members: {
          orderBy: { joinedAt: "asc" },
          select: { user: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true } } },
        },
        _count: { select: { projects: true } },
      },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarImage: true, avatarIcon: true },
    }),
  ]);

  return (
    <TeamsView
      initialTeams={teams.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        leader: t.leader,
        members: t.members.map((m) => m.user),
        projectCount: t._count.projects,
      }))}
      allUsers={allUsers}
      canManage={can.manageTeams(user)}
    />
  );
}
