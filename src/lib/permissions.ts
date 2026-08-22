import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

export type ProjectAccess = {
  project: {
    id: string;
    key: string;
    name: string;
    ownerId: string;
  };
  isMember: boolean;
  projectRole: "ADMIN" | "MEMBER" | "VIEWER" | null;
  /** Effective permission to view the project at all. */
  canView: boolean;
};

export class PermissionError extends Error {
  constructor(message = "FORBIDDEN") {
    super(message);
  }
}

/** Load a project + the caller's role in it. Returns null when no access. */
export async function getProjectAccess(
  user: SessionUser,
  projectId: string,
): Promise<ProjectAccess | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, key: true, name: true, ownerId: true, state: true },
  });
  if (!project) return null;

  if (user.role === "OWNER") {
    return { project, isMember: true, projectRole: "ADMIN", canView: true };
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!membership) return null;

  return {
    project,
    isMember: true,
    projectRole: membership.role,
    canView: true,
  };
}

export async function requireProjectAccess(
  user: SessionUser,
  projectId: string,
): Promise<ProjectAccess> {
  const access = await getProjectAccess(user, projectId);
  if (!access) throw new PermissionError();
  return access;
}

function isAdmin(user: SessionUser, access: ProjectAccess): boolean {
  return user.role === "OWNER" || (user.role === "PROJECT_MANAGER" && access.projectRole === "ADMIN");
}

// ─── Capability checks (server-side only) ────────────────────────

export const can = {
  createProject: (user: SessionUser) => user.role === "OWNER" || user.role === "PROJECT_MANAGER",

  editProject: (user: SessionUser, access: ProjectAccess) => isAdmin(user, access),

  deleteProject: (user: SessionUser) => user.role === "OWNER",

  manageMembers: (user: SessionUser, access: ProjectAccess) => isAdmin(user, access),

  manageSprints: (user: SessionUser, access: ProjectAccess) =>
    isAdmin(user, access) ||
    ((user.role === "DEVELOPER" || user.role === "PROJECT_MANAGER") && access.projectRole !== "VIEWER"),

  manageWorkflow: (user: SessionUser, access: ProjectAccess) => isAdmin(user, access),

  createIssue: (user: SessionUser, access: ProjectAccess) =>
    user.role !== "VIEWER" && access.projectRole !== "VIEWER",

  editIssue: (user: SessionUser, access: ProjectAccess) =>
    user.role !== "VIEWER" && access.projectRole !== "VIEWER",

  deleteIssue: (user: SessionUser, access: ProjectAccess) =>
    isAdmin(user, access),

  logTime: (user: SessionUser, access: ProjectAccess) =>
    user.role !== "VIEWER" && access.projectRole !== "VIEWER",

  comment: (user: SessionUser, access: ProjectAccess) =>
    user.role !== "VIEWER" && access.projectRole !== "VIEWER",

  viewReports: () => true,

  manageUsers: (user: SessionUser) => user.role === "OWNER",

  manageTeams: (user: SessionUser) => user.role === "OWNER" || user.role === "PROJECT_MANAGER",
};

export function assert(condition: boolean, message = "FORBIDDEN"): void {
  if (!condition) throw new PermissionError(message);
}
