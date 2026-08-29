import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getProjectAccess } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id } = await params;
  const access = await getProjectAccess(user, id);
  if (!access) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const [members, sprints, statuses, labels] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: id },
      select: {
        role: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarColor: true, avatarImage: true, avatarIcon: true } },
      },
    }),
    prisma.sprint.findMany({
      where: { projectId: id, state: { not: "COMPLETED" } },
      select: { id: true, name: true, state: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.projectStatus.findMany({
      where: { projectId: id },
      select: { id: true, name: true, category: true, order: true, isDefault: true },
      orderBy: { order: "asc" },
    }),
    prisma.label.findMany({
      where: { projectId: id },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    members: members.map((m) => ({ ...m.user, memberRole: m.role })),
    sprints,
    statuses,
    labels,
  });
}
