import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const projects = await prisma.project.findMany({
    where:
      user.role === "OWNER"
        ? {}
        : { members: { some: { userId: user.id } } },
    select: { id: true, key: true, name: true, icon: true },
    orderBy: { createdAt: "asc" },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return (
    <Providers>
      <AppShell user={user} projects={projects} unreadCount={unreadCount}>
        {children}
      </AppShell>
    </Providers>
  );
}
