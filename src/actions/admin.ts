"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";
import { assert, can } from "@/lib/permissions";
import { action } from "@/lib/action-result";
import { createUserSchema, updateUserSchema } from "@/lib/validators";
import { pickAvatarColor, ROLE_LABELS } from "@/lib/utils";

export async function createUser(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    assert(can.manageUsers(user));
    const parsed = createUserSchema.parse(input);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email.toLowerCase() } });
    if (existing) throw new Error("EMAIL_TAKEN");

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const created = await prisma.user.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email.toLowerCase(),
        passwordHash,
        role: parsed.role,
        avatarColor: parsed.avatarColor ?? pickAvatarColor(parsed.email),
      },
    });
    revalidatePath("/users");
    return { id: created.id };
  });
}

export async function updateUser(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    assert(can.manageUsers(user));
    const parsed = updateUserSchema.parse(input);

    if (parsed.id === user.id && (parsed.role ?? "DEVELOPER") !== user.role) {
      throw new Error("CANNOT_CHANGE_OWN_ROLE");
    }
    if (parsed.id === user.id && parsed.status === "DISABLED") {
      throw new Error("CANNOT_DISABLE_SELF");
    }

    const data: Record<string, unknown> = {};
    if (parsed.firstName !== undefined) data.firstName = parsed.firstName;
    if (parsed.lastName !== undefined) data.lastName = parsed.lastName;
    if (parsed.role !== undefined) data.role = parsed.role;
    if (parsed.status !== undefined) data.status = parsed.status;
    if (parsed.avatarColor !== undefined) data.avatarColor = parsed.avatarColor;
    if (parsed.password !== undefined) {
      data.passwordHash = await bcrypt.hash(parsed.password, 12);
    }

    const target = await prisma.user.findUnique({ where: { id: parsed.id } });
    if (!target) throw new Error("NOT_FOUND");

    await prisma.user.update({ where: { id: parsed.id }, data });

    // notify role changes
    if (parsed.role !== undefined && parsed.role !== target.role) {
      await prisma.notification.create({
        data: {
          userId: parsed.id,
          type: "STATUS_CHANGED",
          body: `نقش شما به «${ROLE_LABELS[parsed.role]}» تغییر یافت.`,
          link: "/settings",
        },
      });
    }
    if (parsed.status === "DISABLED") {
      await prisma.notification.create({
        data: {
          userId: parsed.id,
          type: "STATUS_CHANGED",
          body: "حساب کاربری شما غیرفعال شد.",
        },
      });
    }

    revalidatePath("/users");
    return { ok: true as const };
  });
}
