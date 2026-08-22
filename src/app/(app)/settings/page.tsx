import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata = { title: "تنظیمات" };

export default async function SettingsPage() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { firstName: true, lastName: true, email: true, avatarColor: true },
  });

  return (
    <SettingsView
      user={{
        firstName: dbUser?.firstName ?? user.firstName,
        lastName: dbUser?.lastName ?? user.lastName,
        email: dbUser?.email ?? "",
        avatarColor: dbUser?.avatarColor ?? "#6366f1",
      }}
    />
  );
}
