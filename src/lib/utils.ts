import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`;
}

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#3b82f6", "#a855f7",
];

export function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const ISSUE_TYPE_LABELS = {
  EPIC: "اپیک",
  STORY: "داستان",
  TASK: "وظیفه",
  BUG: "باگ",
  SUBTASK: "زیر‌وظیفه",
} as const;

export const PRIORITY_LABELS = {
  LOW: "کم",
  MEDIUM: "متوسط",
  HIGH: "بالا",
  CRITICAL: "بحرانی",
} as const;

export const ROLE_LABELS = {
  OWNER: "مالک",
  PROJECT_MANAGER: "مدیر پروژه",
  DEVELOPER: "توسعه‌دهنده",
  VIEWER: "بیننده",
} as const;

export const PROJECT_ROLE_LABELS = {
  ADMIN: "مدیر پروژه",
  MEMBER: "عضو",
  VIEWER: "بیننده",
} as const;

export const SPRINT_STATE_LABELS = {
  PLANNED: "برنامه‌ریزی شده",
  ACTIVE: "فعال",
  COMPLETED: "تکمیل شده",
} as const;

export const STATUS_CATEGORY_LABELS = {
  TODO: "برای انجام",
  IN_PROGRESS: "در حال انجام",
  DONE: "انجام شده",
} as const;

export const NOTIFICATION_LABELS = {
  ISSUE_ASSIGNED: "اختصاص وظیفه",
  MENTION: "منشن",
  COMMENT_ADDED: "کامنت جدید",
  SPRINT_STARTED: "شروع اسپرینت",
  SPRINT_COMPLETED: "پایان اسپرینت",
  OVERDUE: "عقب‌افتادگی",
  STATUS_CHANGED: "تغییر وضعیت",
  PRIORITY_CHANGED: "تغییر اولویت",
  ADDED_TO_PROJECT: "افزودن به پروژه",
} as const;
