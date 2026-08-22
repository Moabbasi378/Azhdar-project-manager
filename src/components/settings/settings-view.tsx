"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2, Save } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { changePassword, updateProfile } from "@/actions/profile";

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"];

export function SettingsView({
  user,
}: {
  user: { firstName: string; lastName: string; email: string; avatarColor: string };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">تنظیمات</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">مدیریت حساب کاربری شما</p>
      </div>

      {/* Profile */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">پروفایل</h2>
        <div className="flex items-center gap-4">
          <Avatar firstName={firstName} lastName={lastName} color={avatarColor} size="lg" />
          <div>
            <Label>رنگ آواتار</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  aria-label={`رنگ ${c}`}
                  className={`size-7 rounded-full transition-transform ${
                    avatarColor === c ? "scale-110 ring-2 ring-ring ring-offset-2 ring-offset-card" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first-name">نام</Label>
            <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-name">نام خانوادگی</Label>
            <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>ایمیل</Label>
          <Input value={user.email} disabled dir="ltr" />
        </div>
        <Button
          disabled={savingProfile}
          onClick={async () => {
            setSavingProfile(true);
            try {
              const res = await updateProfile({ firstName, lastName, avatarColor });
              if (!res.ok) toast.error(res.error);
              else {
                toast.success("پروفایل ذخیره شد");
                startTransition(() => router.refresh());
              }
            } finally {
              setSavingProfile(false);
            }
          }}
        >
          {savingProfile ? <Loader2 className="animate-spin" /> : <Save />} ذخیره پروفایل
        </Button>
      </section>

      {/* Password */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <KeyRound className="size-4 text-primary" /> تغییر رمز عبور
        </h2>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingPassword(true);
            try {
              const res = await changePassword({ currentPassword, newPassword });
              if (!res.ok) {
                toast.error(
                  res.error === "WRONG_PASSWORD" ? "رمز فعلی اشتباه است." : res.error,
                );
                return;
              }
              toast.success("رمز عبور تغییر کرد");
              setCurrentPassword("");
              setNewPassword("");
            } finally {
              setSavingPassword(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="current-pass">رمز عبور فعلی</Label>
            <Input
              id="current-pass"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pass">رمز عبور جدید</Label>
            <Input
              id="new-pass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={savingPassword}>
            {savingPassword && <Loader2 className="animate-spin" />} تغییر رمز
          </Button>
        </form>
      </section>
    </div>
  );
}
