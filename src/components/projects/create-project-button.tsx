"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { createProjectSchema } from "@/lib/validators";
import { createProject } from "@/actions/project";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";

type FormValues = z.input<typeof createProjectSchema>;
type FormOutput = z.output<typeof createProjectSchema>;

const ICONS = ["🚀", "🛒", "💬", "📱", "🎮", "🧩", "📊", "🔧", "🌍", "⚡"];

export function CreateProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState("🚀");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", key: "", description: "", icon: "🚀" },
  });

  async function onSubmit(values: FormOutput) {
    setSubmitting(true);
    try {
      const res = await createProject({ ...values, icon });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("پروژه ایجاد شد");
      setOpen(false);
      form.reset();
      router.push(`/projects/${res.data.key}/board`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> پروژه جدید
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ایجاد پروژه جدید</DialogTitle>
          <DialogDescription>پروژه‌ای برای سازماندهی کارهای تیم</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>آیکون</Label>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`flex size-9 items-center justify-center rounded-lg border text-lg transition-colors ${
                    icon === ic ? "border-primary bg-accent" : "border-border hover:bg-secondary"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">نام پروژه</Label>
              <Input id="p-name" placeholder="مثلاً گیرپاژ" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-key">کلید</Label>
              <Input
                id="p-key"
                dir="ltr"
                placeholder="GIR"
                className="text-left font-mono uppercase"
                {...form.register("key")}
              />
              {form.formState.errors.key && (
                <p className="text-xs text-destructive">{form.formState.errors.key.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">توضیحات</Label>
            <Input id="p-desc" placeholder="اختیاری" {...form.register("description")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />} ایجاد پروژه
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
