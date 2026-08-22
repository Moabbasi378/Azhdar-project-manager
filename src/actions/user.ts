"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { action, UserError } from "@/lib/action-result";
import { pickAvatarColor } from "@/lib/utils";

export async function registerUser(formData: FormData) {
  return action(async () => {
    const parsed = registerSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      throw new UserError(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است");
    }
    const { firstName, lastName, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new UserError("این ایمیل قبلاً ثبت شده است");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        passwordHash,
        avatarColor: pickAvatarColor(email),
        role: "DEVELOPER",
      },
    });
    return { id: user.id };
  });
}
