import { Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Zap className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold leading-tight">اژدر</h1>
          <p className="text-xs text-muted-foreground">مدیریت چابک پروژه‌ها</p>
        </div>
      </div>
      {children}
    </div>
  );
}
