"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notification";
import { NOTIFICATION_LABELS } from "@/lib/utils";
import { formatRelative, toPersianDigits } from "@/lib/jalali";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  type: keyof typeof NOTIFICATION_LABELS;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationsView({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Bell className="size-5 text-primary" /> اعلان‌ها
          {unread > 0 && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              {toPersianDigits(unread)} خوانده‌نشده
            </span>
          )}
        </h1>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const res = await markAllNotificationsRead();
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              setItems((prev) => prev.map((n) => ({ ...n, read: true })));
              startTransition(() => router.refresh());
            }}
          >
            <CheckCheck /> علامت‌گذاری همه
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Bell className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">اعلانی ندارید.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((n) => (
            <li key={n.id} className={cn("relative", !n.read && "bg-primary/[0.04]")}>
              <Link
                href={n.link ?? "/notifications"}
                onClick={async () => {
                  if (n.read) return;
                  setItems((prev) =>
                    prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                  );
                  await markNotificationRead(n.id);
                  startTransition(() => router.refresh());
                }}
                className="block px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <div className="flex items-center gap-2">
                  {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  <span className="text-[11px] font-medium text-primary">
                    {NOTIFICATION_LABELS[n.type] ?? "اعلان"}
                  </span>
                  <time className="mr-auto text-[10px] text-muted-foreground">
                    {formatRelative(n.createdAt)}
                  </time>
                </div>
                <p className={cn("mt-1 text-sm", !n.read && "font-medium")}>{n.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
