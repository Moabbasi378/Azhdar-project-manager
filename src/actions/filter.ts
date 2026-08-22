"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";
import { assert, getProjectAccess } from "@/lib/permissions";
import { action } from "@/lib/action-result";
import { saveFilterSchema } from "@/lib/validators";

export async function saveFilter(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = saveFilterSchema.parse(input);

    if (parsed.projectId) {
      const access = await getProjectAccess(user, parsed.projectId);
      assert(!!access);
    }

    const existing = await prisma.savedFilter.findFirst({
      where: { userId: user.id, name: parsed.name },
    });
    if (existing) {
      await prisma.savedFilter.update({
        where: { id: existing.id },
        data: { filters: parsed.filters as object },
      });
      return { id: existing.id };
    }

    const filter = await prisma.savedFilter.create({
      data: {
        userId: user.id,
        projectId: parsed.projectId ?? null,
        name: parsed.name,
        filters: parsed.filters as object,
      },
    });
    return { id: filter.id };
  });
}

export async function deleteSavedFilter(id: string) {
  return action(async () => {
    const user = await requireUserApi();
    const filter = await prisma.savedFilter.findUnique({ where: { id } });
    if (!filter || filter.userId !== user.id) throw new Error("NOT_FOUND");
    await prisma.savedFilter.delete({ where: { id } });
    if (filter.projectId) {
      const p = await prisma.project.findUnique({
        where: { id: filter.projectId },
        select: { key: true },
      });
      if (p) revalidatePath(`/projects/${p.key}/issues`);
    }
    return { ok: true as const };
  });
}
