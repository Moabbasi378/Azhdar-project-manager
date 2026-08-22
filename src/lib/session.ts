import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: "OWNER" | "PROJECT_MANAGER" | "DEVELOPER" | "VIEWER";
  avatarColor: string;
  avatarImage: string | null;
  avatarIcon: string | null;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.status === "DISABLED") return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    role: user.role,
    avatarColor: user.avatarColor,
    avatarImage: user.avatarImage,
    avatarIcon: user.avatarIcon,
  };
});

/** For pages: redirects to login when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For server actions / route handlers: throws when unauthenticated. */
export async function requireUserApi(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
