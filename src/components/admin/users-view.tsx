"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Search, UserPlus } from "lucide-react";
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
import { Input, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, updateUser } from "@/actions/admin";
import { ROLE_LABELS } from "@/lib/utils";
import { formatJalali } from "@/lib/jalali";

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: keyof typeof ROLE_LABELS;
  status: "ACTIVE" | "DISABLED";
  avatarColor: string;
  avatarImage?: string | null;
  avatarIcon?: string | null;
  createdAt: string;
};

export function UsersView({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      initialUsers.filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [initialUsers, query],
  );

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, id: string | null) {
    setPendingId(id);
    try {
      const res = await fn();
      if (!res.ok) toast.error(ERRORS[res.error ?? ""] ?? res.error);
      else startTransition(() => router.refresh());
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">مدیریت کاربران</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus /> کاربر جدید
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی نام یا ایمیل…"
          className="pr-8"
        />
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {filtered.map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar
              firstName={u.firstName}
              lastName={u.lastName}
              color={u.avatarColor}
              imageUrl={u.avatarImage}
              icon={u.avatarIcon}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {u.firstName} {u.lastName}
                {u.id === currentUserId && (
                  <span className="mr-1.5 text-[10px] text-muted-foreground">(شما)</span>
                )}
              </p>
              <p dir="ltr" className="truncate text-right text-xs text-muted-foreground">{u.email}</p>
            </div>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              عضویت: {formatJalali(u.createdAt)}
            </span>
            <Badge variant={u.role === "OWNER" ? "primary" : "outline"}>{ROLE_LABELS[u.role]}</Badge>
            {u.status === "DISABLED" && <Badge variant="destructive">غیرفعال</Badge>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" disabled={pendingId === u.id} aria-label="عملیات کاربر">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>تغییر نقش</DropdownMenuLabel>
                {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[])
                  .filter((r) => r !== u.role)
                  .map((r) => (
                    <DropdownMenuItem
                      key={r}
                      onSelect={() => run(() => updateUser({ id: u.id, role: r }), u.id)}
                    >
                      {ROLE_LABELS[r]}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                {u.status === "ACTIVE" ? (
                  <DropdownMenuItem
                    destructive
                    disabled={u.id === currentUserId}
                    onSelect={() => run(() => updateUser({ id: u.id, status: "DISABLED" }), u.id)}
                  >
                    غیرفعال‌سازی
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => run(() => updateUser({ id: u.id, status: "ACTIVE" }), u.id)}>
                    فعال‌سازی
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">کاربری یافت نشد.</li>
        )}
      </ul>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => startTransition(() => router.refresh())} />
    </div>
  );
}

const ERRORS: Record<string, string> = {
  EMAIL_TAKEN: "این ایمیل قبلاً ثبت شده است.",
  CANNOT_CHANGE_OWN_ROLE: "نمی‌توانید نقش خودتان را تغییر دهید.",
  CANNOT_DISABLE_SELF: "نمی‌توانید خودتان را غیرفعال کنید.",
};

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<keyof typeof ROLE_LABELS>("DEVELOPER");
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>ایجاد کاربر جدید</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              const res = await createUser({ firstName, lastName, email, password, role });
              if (!res.ok) {
                toast.error(ERRORS[res.error ?? ""] ?? res.error);
                return;
              }
              toast.success("کاربر ایجاد شد");
              onCreated();
              onOpenChange(false);
              setFirstName("");
              setLastName("");
              setEmail("");
              setPassword("");
              setRole("DEVELOPER");
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nu-first">نام</Label>
              <Input id="nu-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required minLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-last">نام خانوادگی</Label>
              <Input id="nu-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required minLength={2} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-email">ایمیل</Label>
            <Input id="nu-email" dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-pass">رمز عبور</Label>
            <Input
              id="nu-pass"
              dir="ltr"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="حداقل ۸ کاراکتر"
            />
          </div>
          <div className="space-y-1.5">
            <Label>نقش</Label>
            <Select value={role} onValueChange={(v) => setRole(v as keyof typeof ROLE_LABELS)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={pending}>ایجاد</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
