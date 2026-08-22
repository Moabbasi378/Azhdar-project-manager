"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";
import { action } from "@/lib/action-result";
import { z } from "zod";

/** Max length of the base64 data URL (~150 KB actual image). */
const MAX_AVATAR_IMAGE_LENGTH = 200_000;

const avatarImageSchema = z
  .string()
  .regex(
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/,
    "تصویر نامعتبر است",
  )
  .refine(
    (value) => value.length <= MAX_AVATAR_IMAGE_LENGTH,
    "حجم تصویر باید کمتر از ۱۵۰ کیلوبایت باشد",
  );

const updateProfileSchema = z.object({
  firstName: z.string().min(2, "نام باید حداقل ۲ حرف باشد").max(60),
  lastName: z.string().min(2, "نام خانوادگی باید حداقل ۲ حرف باشد").max(60),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "رنگ نامعتبر است")
    .optional(),
  avatarImage: avatarImageSchema.nullish(),
  avatarIcon: z.string().min(1).max(8).nullish(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "رمز فعلی الزامی است"),
  newPassword: z.string().min(8, "رمز جدید حداقل ۸ کاراکتر"),
});

export async function updateProfile(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = updateProfileSchema.parse(input);

    const data: {
      firstName: string;
      lastName: string;
      avatarColor?: string;
      avatarImage?: string | null;
      avatarIcon?: string | null;
    } = {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
    };
    if (parsed.avatarColor) data.avatarColor = parsed.avatarColor;

    // Picture and icon are mutually exclusive: setting one clears the other.
    if (parsed.avatarImage !== undefined) {
      data.avatarImage = parsed.avatarImage;
      if (parsed.avatarImage) data.avatarIcon = null;
    }
    if (parsed.avatarIcon !== undefined) {
      data.avatarIcon = parsed.avatarIcon;
      if (parsed.avatarIcon) data.avatarImage = null;
    }

    await prisma.user.update({ where: { id: user.id }, data });

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
