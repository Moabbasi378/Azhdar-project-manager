"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";
import { assert, can } from "@/lib/permissions";
import { action } from "@/lib/action-result";
import { createTeamSchema } from "@/lib/validators";

export async function createTeam(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    assert(can.manageTeams(user));
    const parsed = createTeamSchema.parse(input);

    const team = await prisma.team.create({
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
        leaderId: parsed.leaderId ?? null,
        members: parsed.memberIds?.length
          ? { create: parsed.memberIds.map((userId) => ({ userId })) }
          : undefined,
      },
    });
    revalidatePath("/teams");
    return { id: team.id };
  });
}

export async function updateTeam(
  id: string,
  input: { name?: string; description?: string | null; leaderId?: string | null },
) {
  return action(async () => {
    const user = await requireUserApi();
    assert(can.manageTeams(user));

    await prisma.team.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description !== undefined ? input.description : undefined,
        leaderId: input.leaderId !== undefined ? input.leaderId : undefined,
      },
    });
    revalidatePath("/teams");
    return { ok: true as const };
  });
}

export async function deleteTeam(id: string) {
  return action(async () => {
    const user = await requireUserApi();
    assert(can.manageTeams(user));
    await prisma.team.delete({ where: { id } });
    revalidatePath("/teams");
    return { ok: true as const };
  });
}

export async function addTeamMember(teamId: string, userId: string) {
  return action(async () => {
    const user = await requireUserApi();
    assert(can.manageTeams(user));
    await prisma.teamMember.create({ data: { teamId, userId } });
    revalidatePath("/teams");
    return { ok: true as const };
  });
}

export async function removeTeamMember(teamId: string, userId: string) {
  return action(async () => {
    const user = await requireUserApi();
    assert(can.manageTeams(user));
    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });
    revalidatePath("/teams");
    return { ok: true as const };
  });
}
