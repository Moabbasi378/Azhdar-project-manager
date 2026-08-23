"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, UserPlus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { addProjectMember, removeProjectMember, setMemberRole } from "@/actions/project";
import { PROJECT_ROLE_LABELS } from "@/lib/utils";

type Member = {
  userId: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  firstName: string;
  lastName: string;
  avatarColor: string;
  avatarImage?: string | null;
  avatarIcon?: string | null;
};

export function TeamView({
  projectId,
  initialMembers,
  allUsers,
  canManage,
}: {
  projectId: string;
  initialMembers: Member[];
  allUsers: {
    id: string;
    firstName: string;
    lastName: string;
    avatarColor: string;
    avatarImage?: string | null;
    avatarIcon?: string | null;
  }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, id: string | null): Promise<boolean> {
    setPendingId(id);
    try {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error);
        return false;
      }
      refresh();
      return true;
    } finally {
      setPendingId(null);
    }
  }

  const memberIds = useMemo(() => new Set(initialMembers.map((m) => m.userId)), [initialMembers]);
  const candidates = allUsers
    .filter((u) => !memberIds.has(u.id))
    .filter((u) => `${u.firstName} ${u.lastName}`.includes(query.trim()))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Users className="size-5 text-primary" /> تیم پروژه
        </h1>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus /> افزودن عضو
          </Button>
        )}
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {initialMembers.map((m) => (
          <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
            <Avatar
              firstName={m.firstName}
              lastName={m.lastName}
              color={m.avatarColor}
              imageUrl={m.avatarImage}
              icon={m.avatarIcon}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.firstName} {m.lastName}
              </p>
            </div>
            <Badge variant={m.role === "ADMIN" ? "primary" : "outline"}>
              {PROJECT_ROLE_LABELS[m.role]}
            </Badge>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" disabled={pendingId === m.userId} aria-label="عملیات عضو">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>تغییر نقش</DropdownMenuLabel>
                  {(Object.keys(PROJECT_ROLE_LABELS) as Member["role"][])
                    .filter((r) => r !== m.role)
                    .map((r) => (
                      <DropdownMenuItem
                        key={r}
                        onSelect={() =>
                          run(
                            () => setMemberRole(projectId, m.userId, r),
                            m.userId,
                          )
                        }
                      >
                        {PROJECT_ROLE_LABELS[r]}
                      </DropdownMenuItem>
                    ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    destructive
                    onSelect={() =>
                      run(() => removeProjectMember(projectId, m.userId), m.userId)
                    }
                  >
                    حذف از پروژه
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>افزودن عضو به پروژه</DialogTitle>
          </DialogHeader>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی کاربر…"
          />
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {candidates.length === 0 && (
              <li className="py-4 text-center text-xs text-muted-foreground">کاربری یافت نشد.</li>
            )}
            {candidates.map((u) => (
              <li key={u.id}>
                <button
                  onClick={async () => {
                    const ok = await run(
                      () => addProjectMember({ projectId, userId: u.id, role: "MEMBER" }),
                      u.id,
                    );
                    if (ok) setAddOpen(false);
                  }}
                  disabled={pendingId === u.id}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-secondary"
                >
                  <Avatar
                    firstName={u.firstName}
                    lastName={u.lastName}
                    color={u.avatarColor}
                    imageUrl={u.avatarImage}
                    icon={u.avatarIcon}
                    size="sm"
                  />
                  {u.firstName} {u.lastName}
                  <UserPlus className="mr-auto size-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>بستن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
