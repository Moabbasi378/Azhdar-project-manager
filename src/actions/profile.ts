"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";
import { action } from "@/lib/action-result";
import { z } from "zod";

const updateProfileSchema = z.object({
  firstName: z.string().min(2, "نام باید حداقل ۲ حرف باشد").max(60),
  lastName: z.string().min(2, "نام خانوادگی باید حداقل ۲ حرف باشد").max(60),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "رنگ نامعتبر است")
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "رمز فعلی الزامی است"),
  newPassword: z.string().min(8, "رمز جدید حداقل ۸ کاراکتر"),
});

export async function updateProfile(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = updateProfileSchema.parse(input);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        ...(parsed.avatarColor ? { avatarColor: parsed.avatarColor } : {}),
      },
    });

    revalidatePath("/", "layout");
    return { ok: true as const };
  });
}

export async function changePassword(input: unknown) {
  return action(async () => {
    const sessionUser = await requireUserApi();
    const parsed = changePasswordSchema.parse(input);

    const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!dbUser) throw new Error("NOT_FOUND");

    const valid = await bcrypt.compare(parsed.currentPassword, dbUser.passwordHash);
    if (!valid) throw new Error("WRONG_PASSWORD");

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash: await bcrypt.hash(parsed.newPassword, 12) },
    });
    return { ok: true as const };
  });
}
