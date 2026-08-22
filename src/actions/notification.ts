"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";
import { action } from "@/lib/action-result";

export async function markNotificationRead(id: string) {
  return action(async () => {
    const user = await requireUserApi();
    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });
    revalidatePath("/notifications");
    return { ok: true as const };
  });
}

export async function markAllNotificationsRead() {
  return action(async () => {
    const user = await requireUserApi();
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    revalidatePath("/notifications");
    return { ok: true as const };
  });
}
