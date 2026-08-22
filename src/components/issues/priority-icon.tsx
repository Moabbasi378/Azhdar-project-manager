import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, CircleAlert, Equal } from "lucide-react";
import type { Priority } from "@/generated/prisma/client";

export const PRIORITY_META: Record<
  Priority,
  { label: string; icon: typeof ArrowUp; color: string }
> = {
  LOW: { label: "کم", icon: ArrowDown, color: "text-sky-500" },
  MEDIUM: { label: "متوسط", icon: Equal, color: "text-muted-foreground" },
  HIGH: { label: "بالا", icon: ArrowUp, color: "text-orange-500" },
  CRITICAL: { label: "بحرانی", icon: CircleAlert, color: "text-red-500" },
};

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITY_META[priority];
  const Icon = meta.icon;
  return <Icon className={cn("size-3.5 shrink-0", meta.color, className)} aria-label={`اولویت ${meta.label}`} />;
}
