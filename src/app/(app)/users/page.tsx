import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { UsersView, type AdminUser } from "@/components/admin/users-view";

export const metadata = { title: "مدیریت کاربران" };

export default async function UsersPage() {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      status: true,
      avatarColor: true, avatarImage: true, avatarIcon: true,
      createdAt: true,
    },
  });

  return (
    <UsersView
      initialUsers={users.map(
        (u): AdminUser => ({
          ...u,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt.toISOString(),
        }),
      )}
      currentUserId={user.id}
    />
  );
}
