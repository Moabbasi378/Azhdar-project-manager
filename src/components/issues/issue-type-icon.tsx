import { cn } from "@/lib/utils";
import { Bug, CircleDot, Layers, ListTree, Zap } from "lucide-react";
import type { IssueType } from "@/generated/prisma/client";

export const ISSUE_TYPE_META: Record<
  IssueType,
  { label: string; icon: typeof Zap; color: string }
> = {
  EPIC: { label: "اپیک", icon: Layers, color: "text-violet-500" },
  STORY: { label: "داستان", icon: Zap, color: "text-emerald-500" },
  TASK: { label: "وظیفه", icon: CircleDot, color: "text-sky-500" },
  BUG: { label: "باگ", icon: Bug, color: "text-red-500" },
  SUBTASK: { label: "زیر‌وظیفه", icon: ListTree, color: "text-muted-foreground" },
};

export function IssueTypeIcon({ type, className }: { type: IssueType; className?: string }) {
  const meta = ISSUE_TYPE_META[type];
  const Icon = meta.icon;
  return <Icon className={cn("size-3.5 shrink-0", meta.color, className)} aria-label={meta.label} />;
}
