"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { loginSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type LoginForm = { email: string; password: string };

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    setSubmitting(true);
    try {
      const res = await signIn("credentials", { ...values, redirect: false });
      if (res?.error) {
        toast.error("ایمیل یا رمز عبور اشتباه است");
        return;
      }
      const callbackUrl = params.get("callbackUrl");
      router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold">ورود به حساب</h2>
      <p className="mb-5 text-sm text-muted-foreground">برای ادامه وارد شوید</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">ایمیل</Label>
          <Input
            id="email"
            type="email"
            dir="ltr"
            className="text-left"
            placeholder="you@example.com"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">رمز عبور</Label>
          <Input
            id="password"
            type="password"
            dir="ltr"
            className="text-left"
            placeholder="••••••••"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          ورود
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        حساب ندارید؟{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          ثبت‌نام کنید
        </Link>
      </p>
    </div>
  );
}
