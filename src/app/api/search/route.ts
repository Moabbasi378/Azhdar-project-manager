import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ issues: [], projects: [], users: [], sprints: [] });
  }

  const visibleProjects = await prisma.project.findMany({
    where:
      user.role === "OWNER"
        ? {}
        : { members: { some: { userId: user.id } } },
    select: { id: true },
  });
  const projectIds = visibleProjects.map((p) => p.id);

  const [issues, projects, users, sprints] = await Promise.all([
    // exact key match or title contains
    prisma.issue.findMany({
      where: {
        AND: [
          { projectId: { in: projectIds } },
          {
            OR: [
              { key: { contains: q } },
              { title: { contains: q } },
            ],
          },
        ],
      },
      select: {
        key: true,
        title: true,
        type: true,
        priority: true,
        status: { select: { name: true, category: true } },
        project: { select: { key: true, name: true, icon: true } },
      },
      take: 8,
      orderBy: { number: "desc" },
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds }, OR: [{ key: { contains: q } }, { name: { contains: q } }] },
      select: { key: true, name: true, icon: true },
      take: 4,
    }),
    prisma.user.findMany({
      where: {
        AND: [
          { status: "ACTIVE" },
          {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
            ],
          },
        ],
      },
      select: { id: true, firstName: true, lastName: true, avatarColor: true, email: true },
      take: 4,
    }),
    prisma.sprint.findMany({
      where: { projectId: { in: projectIds }, name: { contains: q } },
      select: { id: true, name: true, state: true, project: { select: { name: true, key: true } } },
      take: 4,
    }),
  ]);

  return NextResponse.json({ issues, projects, users, sprints });
}
