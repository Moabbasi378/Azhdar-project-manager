"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, KeyRound, Loader2, Save, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { changePassword, updateProfile } from "@/actions/profile";

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"];

const ICONS = [
  "🦊", "🐼", "🐯", "🦁", "🐨", "🐵", "🐸", "🦉",
  "🚀", "⭐", "🌙", "🔥", "🎯", "💡", "🧠", "🎨",
  "🎧", "🎮", "⚽", "🏀", "🍕", "🌵", "🌸", "🤖",
  "🦄", "🐝", "🦋", "🐳", "🍀", "👾", "🐧", "🐢",
];

const AVATAR_SIZE = 192;

/** Downscales the selected image to a square JPEG data URL to keep it small. */
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNSUPPORTED");
  const scale = Math.max(AVATAR_SIZE / bitmap.width, AVATAR_SIZE / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (AVATAR_SIZE - w) / 2, (AVATAR_SIZE - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function SettingsView({
  user,
}: {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatarColor: string;
    avatarImage: string | null;
    avatarIcon: string | null;
  };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);
  /** undefined = untouched (not sent to server), string = uploaded image, null = removed. */
  const [avatarImage, setAvatarImage] = useState<string | null | undefined>(undefined);
  const [avatarIcon, setAvatarIcon] = useState<string | null | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // What the preview should render right now.
  const previewImage =
    avatarImage !== undefined ? avatarImage : avatarIcon === undefined ? user.avatarImage : null;
  const previewIcon =
    avatarIcon !== undefined ? avatarIcon : avatarImage != null ? null : user.avatarIcon;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک تصویر انتخاب کنید");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم تصویر باید کمتر از ۸ مگابایت باشد");
      return;
    }
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarImage(dataUrl);
      setAvatarIcon(null);
    } catch {
      toast.error("پردازش تصویر ناموفق بود");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">تنظیمات</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">مدیریت حساب کاربری شما</p>
      </div>

      {/* Profile */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">پروفایل</h2>
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar
              firstName={firstName}
              lastName={lastName}
              color={avatarColor}
              imageUrl={previewImage}
              icon={previewIcon}
              size="lg"
              className="size-20 text-2xl"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="بارگذاری تصویر"
              aria-label="بارگذاری تصویر پروفایل"
              className="absolute -bottom-1 -left-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-transform hover:scale-105"
            >
              <Camera className="size-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                بارگذاری تصویر
              </Button>
              {(avatarImage || (avatarImage === undefined && user.avatarImage)) && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarImage(null)}>
                  <Trash2 /> حذف تصویر
                </Button>
              )}
            </div>
            <div>
              <Label>آیکون</Label>
              <div className="mt-1.5 grid grid-cols-8 gap-1 sm:flex sm:flex-wrap">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      setAvatarIcon(icon);
                      setAvatarImage(null);
                    }}
                    aria-label={`آیکون ${icon}`}
                    className={`flex size-7 items-center justify-center rounded-lg text-base leading-none transition-transform hover:scale-110 ${
                      previewIcon === icon ? "bg-accent ring-2 ring-ring" : ""
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
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
              const payload: Record<string, unknown> = { firstName, lastName, avatarColor };
              if (avatarImage !== undefined) payload.avatarImage = avatarImage;
              if (avatarIcon !== undefined) payload.avatarIcon = avatarIcon;
              const res = await updateProfile(payload);
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
