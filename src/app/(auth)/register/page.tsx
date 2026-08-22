"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { registerSchema } from "@/lib/validators";
import { registerUser } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterForm) {
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => fd.set(k, v));
      const res = await registerUser(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const login = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (login?.error) {
        toast.success("ثبت‌نام انجام شد؛ وارد شوید");
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold">ساخت حساب جدید</h2>
      <p className="mb-5 text-sm text-muted-foreground">در چند ثانیه عضو شوید</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">نام</Label>
            <Input id="firstName" placeholder="محمد" {...form.register("firstName")} />
            {form.formState.errors.firstName && (
              <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">نام خانوادگی</Label>
            <Input id="lastName" placeholder="محمدی" {...form.register("lastName")} />
            {form.formState.errors.lastName && (
              <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
            )}
          </div>
        </div>
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
            placeholder="حداقل ۸ کاراکتر"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          ثبت‌نام
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          وارد شوید
        </Link>
      </p>
    </div>
  );
}
