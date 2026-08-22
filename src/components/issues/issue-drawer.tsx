"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Maximize2 } from "lucide-react";
import { Skeleton } from "@/components/ui/input";
import { IssueDetailBody } from "@/components/issues/issue-detail-body";
import type { IssueDetailData } from "@/lib/issue-types";

const DrawerContext = createContext<{ openIssue: (key: string) => void } | null>(null);

export function useIssueDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useIssueDrawer must be used within IssueDrawerProvider");
  return ctx;
}

export function IssueDrawerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [issueKey, setIssueKey] = useState<string | null>(null);
  const open = issueKey !== null;

  const openIssue = useCallback((key: string) => setIssueKey(key), []);
  const close = useCallback(() => setIssueKey(null), []);

  const { data, isLoading } = useQuery<IssueDetailData>({
    queryKey: ["issue", issueKey],
    queryFn: async () => {
      const res = await fetch(`/api/issues/${issueKey}`);
      if (!res.ok) throw new Error("خطا در دریافت وظیفه");
      return res.json();
    },
    enabled: open,
    staleTime: 5_000,
  });

  return (
    <DrawerContext.Provider value={{ openIssue }}>
      {children}
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 animate-fade-in" />
          <DialogPrimitive.Content
            dir="rtl"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl outline-none"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">
              {data?.issue.title ?? "جزئیات وظیفه"}
            </DialogPrimitive.Title>

            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span dir="ltr" className="font-mono text-xs text-muted-foreground">
                {data?.issue.key ?? issueKey}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const k = issueKey;
                    close();
                    router.push(`/issue/${k}`);
                  }}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="نمایش کامل"
                  title="نمایش کامل"
                >
                  <Maximize2 className="size-4" />
                </button>
                <DialogPrimitive.Close
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="بستن"
                >
                  <X className="size-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading || !data ? (
                <div className="space-y-4 p-5">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <IssueDetailBody data={data} compact />
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </DrawerContext.Provider>
  );
}
