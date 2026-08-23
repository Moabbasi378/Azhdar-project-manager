"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, MoreHorizontal, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, Label, Textarea } from "@/components/ui/input";
import { addTeamMember, createTeam, deleteTeam, removeTeamMember } from "@/actions/team";
import { toPersianDigits } from "@/lib/jalali";

type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatarColor: string;
  avatarImage?: string | null;
  avatarIcon?: string | null;
};

type TeamData = {
  id: string;
  name: string;
  description: string | null;
  leader: TeamMember | null;
  members: TeamMember[];
  projectCount: number;
};

export function TeamsView({
  initialTeams,
  allUsers,
  canManage,
}: {
  initialTeams: TeamData[];
  allUsers: TeamMember[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [addMemberTeam, setAddMemberTeam] = useState<TeamData | null>(null);
  const [query, setQuery] = useState("");

  function refresh() {
    startTransition(() => router.refresh());
  }

  const memberIds = useMemo(
    () => new Set(addMemberTeam?.members.map((m) => m.id) ?? []),
    [addMemberTeam],
  );
  const candidates = (addMemberTeam ? allUsers : [])
    .filter((u) => !memberIds.has(u.id))
    .filter((u) => `${u.firstName} ${u.lastName}`.includes(query.trim()))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Users className="size-5 text-primary" /> تیم‌ها
        </h1>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> تیم جدید
          </Button>
        )}
      </div>

      {initialTeams.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Users className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">هنوز تیمی ساخته نشده است.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {initialTeams.map((team) => (
          <section key={team.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{team.name}</h2>
                {team.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{team.description}</p>
                )}
              </div>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="عملیات تیم">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setAddMemberTeam(team)}>
                      <UserPlus /> افزودن عضو
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      destructive
                      onSelect={async () => {
                        const res = await deleteTeam(team.id);
                        if (!res.ok) toast.error(res.error);
                        else {
                          toast.success("تیم حذف شد");
                          refresh();
                        }
                      }}
                    >
                      <Trash2 /> حذف تیم
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              {toPersianDigits(team.members.length)} عضو · {toPersianDigits(team.projectCount)} پروژه
            </p>

            <ul className="mt-2 space-y-1.5">
              {team.members.slice(0, 6).map((m) => {
                const isLeader = team.leader?.id === m.id;
                return (
                  <li key={m.id} className="group flex items-center gap-2 text-sm">
                    <Avatar
                      firstName={m.firstName}
                      lastName={m.lastName}
                      color={m.avatarColor}
                      imageUrl={m.avatarImage}
                      icon={m.avatarIcon}
                      size="xs"
                    />
                    <span className="truncate">{m.firstName} {m.lastName}</span>
                    {isLeader && <Crown className="size-3.5 shrink-0 text-amber-500" />}
                    {canManage && (
                      <button
                        aria-label={`حذف ${m.firstName}`}
                        onClick={async () => {
                          const res = await removeTeamMember(team.id, m.id);
                          if (!res.ok) toast.error(res.error);
                          else refresh();
                        }}
                        className="mr-auto rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
              {team.members.length > 6 && (
                <li className="text-xs text-muted-foreground">
                  +{toPersianDigits(team.members.length - 6)} عضو دیگر
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>

      {/* Create team */}
      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        users={allUsers}
        onCreate={async ({ name, description, memberIds }) => {
          const res = await createTeam({ name, description: description || undefined, memberIds });
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          toast.success("تیم ایجاد شد");
          refresh();
          return true;
        }}
      />

      {/* Add member dialog */}
      <Dialog open={!!addMemberTeam} onOpenChange={(open) => !open && setAddMemberTeam(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>افزودن عضو به «{addMemberTeam?.name}»</DialogTitle>
          </DialogHeader>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی کاربر…" />
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {candidates.length === 0 && (
              <li className="py-4 text-center text-xs text-muted-foreground">کاربری یافت نشد.</li>
            )}
            {candidates.map((u) => (
              <li key={u.id}>
                <button
                  onClick={async () => {
                    if (!addMemberTeam) return;
                    const res = await addTeamMember(addMemberTeam.id, u.id);
                    if (!res.ok) {
                      toast.error(res.error);
                      return;
                    }
                    refresh();
                    setAddMemberTeam(null);
                  }}
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
            <Button variant="outline" onClick={() => setAddMemberTeam(null)}>بستن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateTeamDialog({
  open,
  onOpenChange,
  users,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: TeamMember[];
  onCreate: (data: { name: string; description: string; memberIds: string[] }) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setName("");
    setDescription("");
    setSelected(new Set());
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>تیم جدید</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              const ok = await onCreate({ name, description, memberIds: [...selected] });
              if (ok) onOpenChange(false);
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="team-name">نام تیم</Label>
            <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-desc">توضیحات (اختیاری)</Label>
            <Textarea id="team-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} />
          </div>
          <div className="space-y-1.5">
            <Label>اعضا</Label>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-1.5">
              {users.map((u) => (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={(e) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(u.id);
                          else next.delete(u.id);
                          return next;
                        })
                      }
                      className="size-4 accent-[var(--primary)]"
                    />
                    <Avatar
                      firstName={u.firstName}
                      lastName={u.lastName}
                      color={u.avatarColor}
                      imageUrl={u.avatarImage}
                      icon={u.avatarIcon}
                      size="xs"
                    />
                    {u.firstName} {u.lastName}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={pending || !name.trim()}>ایجاد تیم</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
