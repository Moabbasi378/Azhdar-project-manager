"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";
import { assert, can, getProjectAccess } from "@/lib/permissions";
import { action } from "@/lib/action-result";
import {
  completeSprintSchema,
  createSprintSchema,
  startSprintSchema,
  updateSprintSchema,
} from "@/lib/validators";

function revalidateProject(key: string) {
  revalidatePath(`/projects/${key}/board`);
  revalidatePath(`/projects/${key}/backlog`);
  revalidatePath(`/projects/${key}/sprints`);
  revalidatePath("/dashboard");
}

export async function createSprint(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = createSprintSchema.parse(input);
    const access = await getProjectAccess(user, parsed.projectId);
    assert(!!access);
    assert(can.manageSprints(user, access!));

    const count = await prisma.sprint.count({ where: { projectId: parsed.projectId } });

    const sprint = await prisma.sprint.create({
      data: {
        projectId: parsed.projectId,
        name: parsed.name?.trim() || `اسپرینت ${count + 1}`,
        goal: parsed.goal ?? null,
        startDate: parsed.startDate ?? null,
        endDate: parsed.endDate ?? null,
      },
    });

    revalidateProject(access!.project.key);
    return { id: sprint.id };
  });
}

export async function updateSprint(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = updateSprintSchema.parse(input);

    const sprint = await prisma.sprint.findUnique({ where: { id: parsed.id } });
    if (!sprint) throw new Error("NOT_FOUND");
    const access = await getProjectAccess(user, sprint.projectId);
    assert(!!access);
    assert(can.manageSprints(user, access!));

    await prisma.sprint.update({
      where: { id: sprint.id },
      data: {
        name: parsed.name ?? undefined,
        goal: "goal" in parsed ? parsed.goal : undefined,
        startDate: "startDate" in parsed ? parsed.startDate : undefined,
        endDate: "endDate" in parsed ? parsed.endDate : undefined,
      },
    });

    revalidateProject(access!.project.key);
    return { ok: true as const };
  });
}

export async function deleteSprint(id: string) {
  return action(async () => {
    const user = await requireUserApi();
    const sprint = await prisma.sprint.findUnique({ where: { id } });
    if (!sprint) throw new Error("NOT_FOUND");
    const access = await getProjectAccess(user, sprint.projectId);
    assert(!!access);
    assert(can.manageSprints(user, access!));
    if (sprint.state === "ACTIVE") throw new Error("ACTIVE_SPRINT");

    // issues go back to backlog
    await prisma.issue.updateMany({ where: { sprintId: id }, data: { sprintId: null } });
    await prisma.sprint.delete({ where: { id } });

    revalidateProject(access!.project.key);
    return { ok: true as const };
  });
}

export async function startSprint(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = startSprintSchema.parse(input);

    const sprint = await prisma.sprint.findUnique({ where: { id: parsed.id } });
    if (!sprint) throw new Error("NOT_FOUND");
    const access = await getProjectAccess(user, sprint.projectId);
    assert(!!access);
    assert(can.manageSprints(user, access!));

    // only one active sprint per project
    const active = await prisma.sprint.findFirst({
      where: { projectId: sprint.projectId, state: "ACTIVE" },
    });
    if (active && active.id !== sprint.id) throw new Error("ANOTHER_ACTIVE");

    const startDate = parsed.startDate ?? sprint.startDate ?? new Date();
    const endDate =
      parsed.endDate ?? sprint.endDate ?? new Date(Date.now() + 14 * 86_400_000);

    await prisma.sprint.update({
      where: { id: sprint.id },
      data: { state: "ACTIVE", startDate, endDate },
    });

    // notify members
    const members = await prisma.projectMember.findMany({
      where: { projectId: sprint.projectId },
      select: { userId: true },
    });
    for (const m of members) {
      if (m.userId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: m.userId,
            type: "SPRINT_STARTED",
            body: `اسپرینت «${sprint.name}» شروع شد.`,
            link: `/projects/${access!.project.key}/board`,
          },
        });
      }
    }

    revalidateProject(access!.project.key);
    return { ok: true as const };
  });
}

export async function completeSprint(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = completeSprintSchema.parse(input);

    const sprint = await prisma.sprint.findUnique({ where: { id: parsed.id } });
    if (!sprint) throw new Error("NOT_FOUND");
    const access = await getProjectAccess(user, sprint.projectId);
    assert(!!access);
    assert(can.manageSprints(user, access!));

    // find next planned sprint for "move to next"
    let nextSprintId: string | null = null;
    if (parsed.unfinished === "NEXT_SPRINT") {
      const next = await prisma.sprint.findFirst({
        where: { projectId: sprint.projectId, state: "PLANNED", id: { not: sprint.id } },
        orderBy: { createdAt: "asc" },
      });
      if (!next) throw new Error("NO_NEXT_SPRINT");
      nextSprintId = next.id;
    }

    await prisma.$transaction(async (tx) => {
      if (parsed.unfinished === "BACKLOG") {
        await tx.issue.updateMany({
          where: { sprintId: sprint.id, status: { category: { not: "DONE" } } },
          data: { sprintId: null },
        });
      } else if (nextSprintId) {
        await tx.issue.updateMany({
          where: { sprintId: sprint.id, status: { category: { not: "DONE" } } },
          data: { sprintId: nextSprintId },
        });
      }
      await tx.sprint.update({
        where: { id: sprint.id },
        data: { state: "COMPLETED", endDate: sprint.endDate ?? new Date() },
      });
    });

    const members = await prisma.projectMember.findMany({
      where: { projectId: sprint.projectId },
      select: { userId: true },
    });
    for (const m of members) {
      if (m.userId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: m.userId,
            type: "SPRINT_COMPLETED",
            body: `اسپرینت «${sprint.name}» تکمیل شد.`,
            link: `/projects/${access!.project.key}/reports`,
          },
        });
      }
    }

    revalidateProject(access!.project.key);
    return { ok: true as const };
  });
}
