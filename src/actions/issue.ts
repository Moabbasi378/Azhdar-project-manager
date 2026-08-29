"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireUserApi } from "@/lib/session";
import { assert, can, getProjectAccess } from "@/lib/permissions";
import { action } from "@/lib/action-result";
import { orderAfter, orderBetween } from "@/lib/order";
import {
  createCommentSchema,
  createIssueSchema,
  importIssuesSchema,
  logTimeSchema,
  moveIssueSchema,
  updateIssueSchema,
} from "@/lib/validators";
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/utils";
import { toPersianDigits } from "@/lib/jalali";

type ActivityCreate = Prisma.ActivityLogCreateManyInput;
type NotificationInput = {
  userId: string;
  type: Prisma.NotificationCreateInput["type"];
  body: string;
  link?: string | null;
};

async function logActivity(data: ActivityCreate) {
  await prisma.activityLog.create({ data });
}

async function notify(data: NotificationInput) {
  if (!data.userId) return;
  await prisma.notification.create({ data });
}

// ─── Create ───────────────────────────────────────────────────────

export async function createIssue(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = createIssueSchema.parse(input);

    const access = await getProjectAccess(user, parsed.projectId);
    assert(!!access);
    assert(can.createIssue(user, access!));

    const issue = await prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id: parsed.projectId },
        data: { issueSeq: { increment: 1 } },
        select: { issueSeq: true, key: true },
      });
      // guard against drifted counters (e.g. pre-seeded issues): never reuse a number
      let number = project.issueSeq;
      if (number === 1) {
        const agg = await tx.issue.aggregate({
          where: { projectId: parsed.projectId },
          _max: { number: true },
        });
        if (agg._max.number !== null && agg._max.number >= number) number = agg._max.number + 1;
        await tx.project.update({
          where: { id: parsed.projectId },
          data: { issueSeq: number },
        });
      }

      let statusId = parsed.statusId ?? null;
      if (!statusId) {
        const def = await tx.projectStatus.findFirst({
          where: { projectId: parsed.projectId },
          orderBy: { order: "asc" },
        });
        statusId = def?.id ?? null;
      }

      // subtasks sit right after their parent in ordering
      let order = "a0";
      if (parsed.parentId) {
        const parent = await tx.issue.findUnique({
          where: { id: parsed.parentId },
          select: { order: true },
        });
        if (parent) order = orderAfter(parent.order);
      }

      const created = await tx.issue.create({
        data: {
          projectId: parsed.projectId,
          number,
          key: `${project.key}-${number}`,
          title: parsed.title,
          description: parsed.description ?? null,
          type: parsed.type,
          priority: parsed.priority,
          statusId,
          epicId: parsed.epicId ?? null,
          sprintId: parsed.sprintId ?? null,
          parentId: parsed.parentId ?? null,
          assigneeId: parsed.assigneeId ?? null,
          reporterId: user.id,
          storyPoints: parsed.storyPoints ?? null,
          estimatedMinutes: parsed.estimatedMinutes ?? null,
          dueAt: parsed.dueAt ?? null,
          order,
          labels: parsed.labelIds
            ? { create: parsed.labelIds.map((labelId) => ({ labelId })) }
            : undefined,
        },
      });

      await tx.activityLog.create({
        data: {
          issueId: created.id,
          projectId: parsed.projectId,
          userId: user.id,
          kind: "CREATED",
          meta: { title: created.title },
        },
      });

      return created;
    });

    if (parsed.assigneeId && parsed.assigneeId !== user.id) {
      await notify({
        userId: parsed.assigneeId,
        type: "ISSUE_ASSIGNED",
        body: `«${issue.title}» به شما اختصاص یافت.`,
        link: `/issue/${issue.key}`,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath(`/projects/${access!.project.key}/board`);
    revalidatePath(`/projects/${access!.project.key}/backlog`);
    return { id: issue.id, key: issue.key };
  });
}

// ─── Bulk import (e.g. from Excel) ────────────────────────────────

export async function importIssues(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = importIssuesSchema.parse(input);

    const access = await getProjectAccess(user, parsed.projectId);
    assert(!!access);
    assert(can.createIssue(user, access!));

    const sprintId: string | null = parsed.sprintId ?? null;
    if (sprintId) {
      const sprint = await prisma.sprint.findFirst({
        where: { id: sprintId, projectId: parsed.projectId },
      });
      if (!sprint) throw new Error("NOT_FOUND");
    }

    // drop assignees that aren't project members
    const requestedIds = parsed.issues
      .map((i) => i.assigneeId)
      .filter((id): id is string => !!id);
    let validAssigneeIds = new Set<string>();
    if (requestedIds.length > 0) {
      const members = await prisma.projectMember.findMany({
        where: { projectId: parsed.projectId, userId: { in: requestedIds } },
        select: { userId: true },
      });
      validAssigneeIds = new Set(members.map((m) => m.userId));
    }

    const defaultStatus = await prisma.projectStatus.findFirst({
      where: { projectId: parsed.projectId },
      orderBy: { order: "asc" },
    });

    const created = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: parsed.projectId },
        select: { key: true, issueSeq: true },
      });
      if (!project) throw new Error("NOT_FOUND");

      // never reuse a drifted counter (issueSeq stuck at 1 from seeding)
      let number = project.issueSeq + 1;
      const agg = await tx.issue.aggregate({
        where: { projectId: parsed.projectId },
        _max: { number: true },
      });
      if (agg._max.number !== null && agg._max.number >= number) number = agg._max.number + 1;

      const rows: (Prisma.IssueCreateManyInput & { key: string })[] = [];
      for (const issue of parsed.issues) {
        const key = `${project.key}-${number}`;
        rows.push({
          projectId: parsed.projectId,
          number,
          key,
          title: issue.title,
          description: issue.description ?? null,
          type: issue.type,
          priority: issue.priority,
          statusId: defaultStatus?.id ?? null,
          sprintId,
          assigneeId: issue.assigneeId && validAssigneeIds.has(issue.assigneeId) ? issue.assigneeId : null,
          reporterId: user.id,
          storyPoints: issue.storyPoints ?? null,
          estimatedMinutes: issue.estimatedMinutes ?? null,
          order: `i${String(number).padStart(8, "0")}`,
        });
        number += 1;
      }

      await tx.issue.createMany({ data: rows });
      await tx.project.update({
        where: { id: parsed.projectId },
        data: { issueSeq: number - 1 },
      });
      await tx.activityLog.create({
        data: {
          projectId: parsed.projectId,
          userId: user.id,
          kind: "CREATED",
          meta: { source: "import", count: rows.length },
        },
      });
      return rows;
    });

    // notify new assignees once per person
    const mentioned = new Map<string, { issueKey: string; title: string }[]>();
    for (const issue of created) {
      if (issue.assigneeId && issue.assigneeId !== user.id) {
        const list = mentioned.get(issue.assigneeId) ?? [];
        list.push({ issueKey: issue.key, title: issue.title });
        mentioned.set(issue.assigneeId, list);
      }
    }
    for (const [userId, issues] of mentioned) {
      await notify({
        userId,
        type: "ISSUE_ASSIGNED",
        body: issues.length === 1
          ? `«${issues[0].title}» به شما اختصاص یافت.`
          : `${toPersianDigits(issues.length)} وظیفه به شما اختصاص یافت.`,
        link: `/projects/${access!.project.key}/board`,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/my-work");
    revalidatePath(`/projects/${access!.project.key}/board`);
    revalidatePath(`/projects/${access!.project.key}/backlog`);
    revalidatePath(`/projects/${access!.project.key}/sprints`);
    return { count: created.length, keys: created.map((c) => c.key) };
  });
}

// ─── Update ───────────────────────────────────────────────────────

export async function updateIssue(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = updateIssueSchema.parse(input);

    const existing = await prisma.issue.findUnique({
      where: { id: parsed.id },
      include: { status: { select: { name: true, category: true } } },
    });
    if (!existing) throw new Error("NOT_FOUND");

    const access = await getProjectAccess(user, existing.projectId);
    assert(!!access);
    assert(can.editIssue(user, access!));

    const data: Record<string, unknown> = {};
    const activities: ActivityCreate[] = [];
    const notifications: NotificationInput[] = [];

    const simpleFields = [
      ["title", "عنوان"],
      ["description", "توضیحات"],
      ["storyPoints", "استوری پوینت"],
      ["estimatedMinutes", "زمان تخمینی"],
      ["dueAt", "تاریخ سررسید"],
      ["startAt", "تاریخ شروع"],
    ] as const;

    for (const [field, label] of simpleFields) {
      if (field in parsed && parsed[field] !== undefined) {
        const newValue = parsed[field];
        const oldValue = existing[field];
        if (newValue !== oldValue) {
          data[field] = newValue;
          activities.push({
            issueId: existing.id,
            projectId: existing.projectId,
            userId: user.id,
            kind: field === "storyPoints" ? "POINTS_CHANGED" : "UPDATED",
            field: label,
            oldValue: oldValue === null ? null : String(oldValue),
            newValue: newValue === null ? null : String(newValue),
          });
        }
      }
    }

    if (parsed.priority && parsed.priority !== existing.priority) {
      data.priority = parsed.priority;
      activities.push({
        issueId: existing.id,
        projectId: existing.projectId,
        userId: user.id,
        kind: "PRIORITY_CHANGED",
        field: "اولویت",
        oldValue: PRIORITY_LABELS[existing.priority],
        newValue: PRIORITY_LABELS[parsed.priority],
      });
      if (existing.assigneeId && existing.assigneeId !== user.id) {
        notifications.push({
          userId: existing.assigneeId,
          type: "PRIORITY_CHANGED",
          body: `اولویت «${existing.title}» به ${PRIORITY_LABELS[parsed.priority]} تغییر کرد.`,
          link: `/issue/${existing.key}`,
        });
      }
    }

    if (parsed.type && parsed.type !== existing.type) {
      data.type = parsed.type;
      activities.push({
        issueId: existing.id,
        projectId: existing.projectId,
        userId: user.id,
        kind: "UPDATED",
        field: "نوع",
        oldValue: ISSUE_TYPE_LABELS[existing.type],
        newValue: ISSUE_TYPE_LABELS[parsed.type],
      });
    }

    if ("assigneeId" in parsed && parsed.assigneeId !== undefined) {
      const newAssignee = parsed.assigneeId ?? null;
      if (newAssignee !== existing.assigneeId) {
        data.assigneeId = newAssignee;
        activities.push({
          issueId: existing.id,
          projectId: existing.projectId,
          userId: user.id,
          kind: "ASSIGNED",
          newValue: newAssignee,
        });
        if (newAssignee && newAssignee !== user.id) {
          notifications.push({
            userId: newAssignee,
            type: "ISSUE_ASSIGNED",
            body: `«${existing.title}» به شما اختصاص یافت.`,
            link: `/issue/${existing.key}`,
          });
        }
      }
    }

    if ("statusId" in parsed && parsed.statusId !== undefined) {
      const newStatusId = parsed.statusId ?? null;
      if (newStatusId !== existing.statusId) {
        const newStatus = newStatusId
          ? await prisma.projectStatus.findUnique({ where: { id: newStatusId } })
          : null;
        data.statusId = newStatusId;
        const wasDone = existing.status?.category === "DONE";
        const isDone = newStatus?.category === "DONE";
        if (isDone && !wasDone) data.completedAt = new Date();
        if (!isDone && wasDone) data.completedAt = null;

        activities.push({
          issueId: existing.id,
          projectId: existing.projectId,
          userId: user.id,
          kind: "STATUS_CHANGED",
          field: "وضعیت",
          oldValue: existing.status?.name ?? "—",
          newValue: newStatus?.name ?? "—",
        });
        if (existing.assigneeId && existing.assigneeId !== user.id) {
          notifications.push({
            userId: existing.assigneeId,
            type: "STATUS_CHANGED",
            body: `وضعیت «${existing.title}» به «${newStatus?.name}» تغییر کرد.`,
            link: `/issue/${existing.key}`,
          });
        }
      }
    }

    if ("epicId" in parsed && parsed.epicId !== undefined && parsed.epicId !== existing.epicId) {
      data.epicId = parsed.epicId;
      activities.push({
        issueId: existing.id,
        projectId: existing.projectId,
        userId: user.id,
        kind: "UPDATED",
        field: "اپیک",
        newValue: parsed.epicId,
      });
    }

    if (parsed.labelIds) {
      await prisma.issueLabel.deleteMany({ where: { issueId: existing.id } });
      if (parsed.labelIds.length > 0) {
        await prisma.issueLabel.createMany({
          data: parsed.labelIds.map((labelId) => ({ issueId: existing.id, labelId })),
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.issue.update({ where: { id: existing.id }, data });
      if (activities.length > 0) {
        await tx.activityLog.createMany({ data: activities });
      }
      return u;
    });

    for (const n of notifications) {
      await notify(n);
    }

    revalidatePath(`/projects/${existing.projectId ? access!.project.key : ""}/board`);
    revalidatePath(`/projects/${access!.project.key}/backlog`);
    revalidatePath("/dashboard");
    revalidatePath("/my-work");
    return { key: updated.key };
  });
}

// ─── Move (board & backlog drag/drop) ─────────────────────────────

export async function moveIssue(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = moveIssueSchema.parse(input);

    const existing = await prisma.issue.findUnique({
      where: { id: parsed.id },
      include: { status: { select: { name: true, category: true } } },
    });
    if (!existing) throw new Error("NOT_FOUND");

    const access = await getProjectAccess(user, existing.projectId);
    assert(!!access);
    assert(can.editIssue(user, access!));

    // compute fractional order between neighbours
    let order = existing.order;
    const before = parsed.beforeId
      ? await prisma.issue.findUnique({ where: { id: parsed.beforeId }, select: { order: true } })
      : null;
    const after = parsed.afterId
      ? await prisma.issue.findUnique({ where: { id: parsed.afterId }, select: { order: true } })
      : null;

    if (before || after) {
      order = orderBetween(before?.order ?? null, after?.order ?? null);
    }

    const data: Record<string, unknown> = {};
    if (order !== existing.order) data.order = order;

    let statusChanged = false;
    if ("statusId" in parsed && parsed.statusId !== undefined && parsed.statusId !== existing.statusId) {
      const newStatus = parsed.statusId
        ? await prisma.projectStatus.findFirst({
            where: { id: parsed.statusId, projectId: existing.projectId },
          })
        : null;
      if (newStatus) {
        data.statusId = newStatus.id;
        statusChanged = true;
        const wasDone = existing.status?.category === "DONE";
        const isDone = newStatus.category === "DONE";
        if (isDone && !wasDone) data.completedAt = new Date();
        if (!isDone && wasDone) data.completedAt = null;
      }
    }

    let sprintChanged = false;
    if ("sprintId" in parsed && parsed.sprintId !== undefined && parsed.sprintId !== existing.sprintId) {
      if (parsed.sprintId === null) {
        data.sprintId = null;
        sprintChanged = true;
      } else {
        const sprint = await prisma.sprint.findFirst({
          where: { id: parsed.sprintId, projectId: existing.projectId },
        });
        if (sprint) {
          data.sprintId = sprint.id;
          sprintChanged = true;
        }
      }
    }

    await prisma.issue.update({ where: { id: existing.id }, data });

    if (statusChanged || sprintChanged) {
      await logActivity({
        issueId: existing.id,
        projectId: existing.projectId,
        userId: user.id,
        kind: sprintChanged ? "MOVED_SPRINT" : "STATUS_CHANGED",
        field: sprintChanged ? "اسپرینت" : "وضعیت",
      });
    }

    revalidatePath(`/projects/${access!.project.key}/board`);
    revalidatePath(`/projects/${access!.project.key}/backlog`);
    return { ok: true as const };
  });
}

// ─── Delete ───────────────────────────────────────────────────────

export async function deleteIssue(id: string) {
  return action(async () => {
    const user = await requireUserApi();
    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) throw new Error("NOT_FOUND");

    const access = await getProjectAccess(user, existing.projectId);
    assert(!!access);
    assert(can.deleteIssue(user, access!));

    await prisma.issue.delete({ where: { id } });
    revalidatePath(`/projects/${access!.project.key}/board`);
    revalidatePath(`/projects/${access!.project.key}/backlog`);
    return { ok: true as const };
  });
}

// ─── Comments (+ mentions) ────────────────────────────────────────

const MENTION_RE = /@([\u0600-\u06FF\u200c\w]+)/g;

export async function addComment(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = createCommentSchema.parse(input);

    const issue = await prisma.issue.findUnique({ where: { id: parsed.issueId } });
    if (!issue) throw new Error("NOT_FOUND");

    const access = await getProjectAccess(user, issue.projectId);
    assert(!!access);
    assert(can.comment(user, access!));

    const comment = await prisma.comment.create({
      data: { issueId: issue.id, authorId: user.id, body: parsed.body },
    });

    await logActivity({
      issueId: issue.id,
      projectId: issue.projectId,
      userId: user.id,
      kind: "COMMENTED",
    });

    // mentions → notifications
    const mentionNames = new Set<string>();
    for (const m of parsed.body.matchAll(MENTION_RE)) {
      mentionNames.add(m[1]);
    }
    if (mentionNames.size > 0) {
      const members = await prisma.projectMember.findMany({
        where: { projectId: issue.projectId },
        select: { user: { select: { id: true, firstName: true } } },
      });
      for (const member of members) {
        if (mentionNames.has(member.user.firstName) && member.user.id !== user.id) {
          await notify({
            userId: member.user.id,
            type: "MENTION",
            body: `${user.fullName} در «${issue.title}» به شما اشاره کرد.`,
            link: `/issue/${issue.key}`,
          });
        }
      }
    }

    if (issue.assigneeId && issue.assigneeId !== user.id) {
      const mentioned = await prisma.projectMember.findFirst({
        where: {
          projectId: issue.projectId,
          user: { firstName: { in: [...mentionNames] } },
        },
        select: { userId: true },
      });
      if (!mentioned || mentioned.userId !== issue.assigneeId) {
        await notify({
          userId: issue.assigneeId,
          type: "COMMENT_ADDED",
          body: `${user.fullName} در «${issue.title}» کامنت گذاشت.`,
          link: `/issue/${issue.key}`,
        });
      }
    }

    revalidatePath(`/issue/${issue.key}`);
    return { id: comment.id };
  });
}

// ─── Time tracking ────────────────────────────────────────────────

export async function logTime(input: unknown) {
  return action(async () => {
    const user = await requireUserApi();
    const parsed = logTimeSchema.parse(input);

    const issue = await prisma.issue.findUnique({
      where: { id: parsed.issueId },
    });
    if (!issue) throw new Error("NOT_FOUND");

    const access = await getProjectAccess(user, issue.projectId);
    assert(!!access);
    assert(can.logTime(user, access!));

    await prisma.$transaction([
      prisma.timeEntry.create({
        data: {
          issueId: issue.id,
          userId: user.id,
          minutes: parsed.minutes,
          description: parsed.description ?? null,
          workedAt: parsed.workedAt ?? new Date(),
        },
      }),
      prisma.issue.update({
        where: { id: issue.id },
        data: { loggedMinutes: { increment: parsed.minutes } },
      }),
      prisma.activityLog.create({
        data: {
          issueId: issue.id,
          projectId: issue.projectId,
          userId: user.id,
          kind: "TIME_LOGGED",
          field: "زمان صرف‌شده",
          newValue: String(parsed.minutes),
          meta: { minutes: parsed.minutes },
        },
      }),
    ]);

    revalidatePath(`/issue/${issue.key}`);
    return { ok: true as const };
  });
}
