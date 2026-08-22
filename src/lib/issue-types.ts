import type {
  ActivityKind,
  IssueType,
  Priority,
  StatusCategory,
  SprintState,
} from "@/generated/prisma/client";

export type UserLite = {
  id: string;
  firstName: string;
  lastName: string;
  avatarColor: string;
  avatarImage?: string | null;
  avatarIcon?: string | null;
};

export type LabelLite = { id: string; name: string; color: string };

export type StatusLite = {
  id: string;
  name: string;
  category: StatusCategory;
  order: number;
  isDefault?: boolean;
};

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  author: UserLite;
};

export type TimeEntryDTO = {
  id: string;
  minutes: number;
  description: string | null;
  workedAt: string;
  user: UserLite;
};

export type ActivityDTO = {
  id: string;
  kind: ActivityKind;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  meta: unknown;
  createdAt: string;
  user: UserLite;
};

export type SubtaskDTO = {
  id: string;
  key: string;
  title: string;
  status: { name: string; category: StatusCategory } | null;
};

export type IssueDetail = {
  id: string;
  key: string;
  number: number;
  title: string;
  description: string | null;
  type: IssueType;
  priority: Priority;
  storyPoints: number | null;
  estimatedMinutes: number | null;
  loggedMinutes: number;
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  status: StatusLite | null;
  sprint: { id: string; name: string; state: SprintState } | null;
  epic: { id: string; key: string; title: string } | null;
  parent: { id: string; key: string; title: string } | null;
  assignee: UserLite | null;
  reporter: UserLite | null;
  labels: { label: LabelLite }[];
  comments: CommentDTO[];
  timeEntries: TimeEntryDTO[];
  activities: ActivityDTO[];
  children: SubtaskDTO[];
};

export type IssueMeta = {
  members: (UserLite & { memberRole: "ADMIN" | "MEMBER" | "VIEWER" })[];
  sprints: { id: string; name: string; state: SprintState }[];
  statuses: StatusLite[];
  labels: LabelLite[];
  epics: { id: string; key: string; title: string }[];
  canEdit: boolean;
};

export type IssueDetailData = { issue: IssueDetail; meta: IssueMeta };
