"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";
import { assert, can, getProjectAccess } from "@/lib/permissions";
import { action } from "@/lib/action-result";
import {
  addMemberSchema,
  createProjectSchema,
  updateProjectSchema,
} from "@/lib/validators";

const DEFAULT_STATUSES = [
  { name: "بک‌لاگ", category: "TODO" as const, order: 0, isDefault: true },
  { name: "برای انجام", category: "TODO" as const, order: 1 },
  { name: "در حال انجام", category: "IN_PROGRESS" as const, order: 2 },
  { name: "در بررسی", category: "IN_PROGRESS" as const, order: 3 },
  { name: "انجام شده", category: "DONE" as const, order: 4 },
];

export async function createProject(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = createProjectSchema.parse(input);
    assert(can.createProject(user));

    const existing = await prisma.project.findUnique({ where: { key: parsed.key } });
    if (existing) throw new Error("P2002");

    const project = await prisma.project.create({
      data: {
        key: parsed.key,
        name: parsed.name,
        description: parsed.description ?? null,
        icon: parsed.icon || "🚀",
        startDate: parsed.startDate ?? null,
        endDate: parsed.endDate ?? null,
        teamId: parsed.teamId ?? null,
        ownerId: user.id,
        members: {
          create: [
            { userId: user.id, role: "ADMIN" },
          ],
        },
        statuses: { create: DEFAULT_STATUSES },
      },
    });

    revalidatePath("/projects");
    return { id: project.id, key: project.key };
  });
}

export async function updateProject(projectId: string, input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = updateProjectSchema.parse(input);
    const access = await getProjectAccess(user, projectId);
    assert(!!access);
    assert(can.editProject(user, access!));

    if (parsed.key && parsed.key !== access!.project.key) {
      const existing = await prisma.project.findUnique({ where: { key: parsed.key } });
      if (existing) throw new Error("P2002");
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        name: parsed.name ?? undefined,
        key: parsed.key ?? undefined,
        description: "description" in parsed ? parsed.description : undefined,
        icon: parsed.icon ?? undefined,
        state: parsed.state ?? undefined,
        startDate: "startDate" in parsed ? parsed.startDate : undefined,
        endDate: "endDate" in parsed ? parsed.endDate : undefined,
        teamId: "teamId" in parsed ? parsed.teamId : undefined,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${parsed.key ?? access!.project.key}`);
    return { ok: true as const };
  });
}

export async function deleteProject(projectId: string) {
  return action(async () => {
    const user = await requireUserApi();
    assert(can.deleteProject(user));
    const access = await getProjectAccess(user, projectId);
    assert(!!access);

    await prisma.project.delete({ where: { id: projectId } });
    revalidatePath("/projects");
    return { ok: true as const };
  });
}

export async function addProjectMember(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = addMemberSchema.parse(input);
    const access = await getProjectAccess(user, parsed.projectId);
    assert(!!access);
    assert(can.manageMembers(user, access!));

    await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: parsed.projectId, userId: parsed.userId },
      },
      create: { projectId: parsed.projectId, userId: parsed.userId, role: parsed.role },
      update: { role: parsed.role },
    });

    await prisma.notification.create({
      data: {
        userId: parsed.userId,
        type: "ADDED_TO_PROJECT",
        body: `به پروژه «${access!.project.name}» اضافه شدید.`,
        link: `/projects/${access!.project.key}/board`,
      },
    });

    revalidatePath(`/projects/${access!.project.key}/settings`);
    revalidatePath(`/projects/${access!.project.key}/team`);
    return { ok: true as const };
  });
}

export async function removeProjectMember(projectId: string, userId: string) {
  return action(async () => {
    const user = await requireUserApi();
    const access = await getProjectAccess(user, projectId);
    assert(!!access);
    assert(can.manageMembers(user, access!));
    if (userId === access!.project.ownerId) throw new Error("OWNER_REMOVE");

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
    revalidatePath(`/projects/${access!.project.key}/settings`);
    revalidatePath(`/projects/${access!.project.key}/team`);
    return { ok: true as const };
  });
}

export async function setMemberRole(projectId: string, userId: string, role: "ADMIN" | "MEMBER" | "VIEWER") {
  return action(async () => {
    const user = await requireUserApi();
    const access = await getProjectAccess(user, projectId);
    assert(!!access);
    assert(can.manageMembers(user, access!));

    await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
    });
    revalidatePath(`/projects/${access!.project.key}/settings`);
    return { ok: true as const };
  });
}

// ─── Workflow (statuses) ─────────────────────────────────────────

export async function createStatus(
  projectId: string,
  input: { name: string; category: "TODO" | "IN_PROGRESS" | "DONE" },
) {
  return action(async () => {
    const user = await requireUserApi();
    const access = await getProjectAccess(user, projectId);
    assert(!!access);
    assert(can.manageWorkflow(user, access!));

    const last = await prisma.projectStatus.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    await prisma.projectStatus.create({
      data: {
        projectId,
        name: input.name.trim(),
        category: input.category,
        order: (last?.order ?? -1) + 1,
      },
    });
    revalidatePath(`/projects/${access!.project.key}/settings`);
    revalidatePath(`/projects/${access!.project.key}/board`);
    return { ok: true as const };
  });
}

export async function deleteStatus(projectId: string, statusId: string) {
  return action(async () => {
    const user = await requireUserApi();
    const access = await getProjectAccess(user, projectId);
    assert(!!access);
    assert(can.manageWorkflow(user, access!));

    // move issues to the default status instead of losing them
    const target =
      (await prisma.projectStatus.findFirst({
        where: { projectId, isDefault: true, id: { not: statusId } },
      })) ??
      (await prisma.projectStatus.findFirst({
        where: { projectId, id: { not: statusId } },
        orderBy: { order: "asc" },
      }));
    if (!target) throw new Error("LAST_STATUS");

    await prisma.issue.updateMany({ where: { statusId }, data: { statusId: target.id } });
    await prisma.projectStatus.delete({ where: { id: statusId } });

    revalidatePath(`/projects/${access!.project.key}/settings`);
    revalidatePath(`/projects/${access!.project.key}/board`);
    return { ok: true as const };
  });
}

export async function reorderStatuses(projectId: string, orderedIds: string[]) {
  return action(async () => {
    const user = await requireUserApi();
    const access = await getProjectAccess(user, projectId);
    assert(!!access);
    assert(can.manageWorkflow(user, access!));

    await prisma.$transaction(
      orderedIds.map((id, i) =>
        prisma.projectStatus.update({ where: { id }, data: { order: i } }),
      ),
    );
    revalidatePath(`/projects/${access!.project.key}/settings`);
    revalidatePath(`/projects/${access!.project.key}/board`);
    return { ok: true as const };
  });
}
