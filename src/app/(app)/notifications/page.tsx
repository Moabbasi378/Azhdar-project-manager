import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { NotificationsView, type NotificationItem } from "@/components/notifications/notifications-view";

export const metadata = { title: "اعلان‌ها" };

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      body: true,
      link: true,
      read: true,
      createdAt: true,
    },
  });

  return (
    <NotificationsView
      initial={notifications.map(
        (n): NotificationItem => ({
          ...n,
          type: n.type,
          createdAt: n.createdAt.toISOString(),
        }),
      )}
    />
  );
}
