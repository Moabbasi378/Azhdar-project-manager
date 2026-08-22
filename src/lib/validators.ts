import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("ایمیل معتبر نیست"),
  password: z.string().min(1, "رمز عبور الزامی است"),
});

export const registerSchema = z.object({
  firstName: z.string().min(2, "نام باید حداقل ۲ حرف باشد"),
  lastName: z.string().min(2, "نام خانوادگی باید حداقل ۲ حرف باشد"),
  email: z.string().email("ایمیل معتبر نیست"),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
});

// ─── Projects ─────────────────────────────────────────────────────

export const projectKeySchema = z
  .string()
  .min(2, "کلید پروژه حداقل ۲ حرف")
  .max(10, "کلید پروژه حداکثر ۱۰ حرف")
  .regex(/^[A-Z][A-Z0-9]+$/, "کلید فقط حروف بزرگ انگلیسی و عدد");

export const createProjectSchema = z.object({
  name: z.string().min(2, "نام پروژه الزامی است").max(80),
  key: projectKeySchema,
  description: z.string().max(2000).optional().nullable(),
  icon: z.string().max(8).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  teamId: z.string().optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  state: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
});

// ─── Issues ───────────────────────────────────────────────────────

export const createIssueSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(2, "عنوان الزامی است").max(300),
  description: z.string().max(20_000).optional().nullable(),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG", "SUBTASK"]).default("TASK"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  statusId: z.string().optional().nullable(),
  epicId: z.string().optional().nullable(),
  sprintId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
  estimatedMinutes: z.number().int().min(0).optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
});

export const updateIssueSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(300).optional(),
  description: z.string().max(20_000).optional().nullable(),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG", "SUBTASK"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  statusId: z.string().optional().nullable(),
  epicId: z.string().optional().nullable(),
  sprintId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
  estimatedMinutes: z.number().int().min(0).optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
  startAt: z.coerce.date().optional().nullable(),
  order: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

export const moveIssueSchema = z.object({
  id: z.string().min(1),
  statusId: z.string().optional().nullable(),
  sprintId: z.string().optional().nullable(),
  beforeId: z.string().optional().nullable(),
  afterId: z.string().optional().nullable(),
});

// ─── Sprints ──────────────────────────────────────────────────────

export const createSprintSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1, "نام اسپرینت الزامی است").max(120),
  goal: z.string().max(500).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const updateSprintSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  goal: z.string().max(500).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const startSprintSchema = z.object({
  id: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const completeSprintSchema = z.object({
  id: z.string().min(1),
  unfinished: z.enum(["BACKLOG", "NEXT_SPRINT"]),
});

// ─── Comments / Time / Teams / Users ─────────────────────────────

export const createCommentSchema = z.object({
  issueId: z.string().min(1),
  body: z.string().min(1, "متن کامنت خالی است").max(5000),
});

export const logTimeSchema = z.object({
  issueId: z.string().min(1),
  minutes: z.number().int().min(1, "مدت نامعتبر").max(24 * 60),
  description: z.string().max(500).optional().nullable(),
  workedAt: z.coerce.date().optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(2, "نام تیم الزامی است").max(80),
  description: z.string().max(1000).optional().nullable(),
  leaderId: z.string().optional().nullable(),
  memberIds: z.array(z.string()).optional(),
});

export const createUserSchema = z.object({
  firstName: z.string().min(2, "نام الزامی است"),
  lastName: z.string().min(2, "نام خانوادگی الزامی است"),
  email: z.string().email("ایمیل معتبر نیست"),
  password: z.string().min(8, "رمز عبور حداقل ۸ کاراکتر"),
  role: z.enum(["OWNER", "PROJECT_MANAGER", "DEVELOPER", "VIEWER"]),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const saveFilterSchema = z.object({
  name: z.string().min(1).max(60),
  projectId: z.string().optional().nullable(),
  filters: z.record(z.string(), z.unknown()),
});

export const addMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});
