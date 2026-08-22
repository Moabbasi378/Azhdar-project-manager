"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="size-10 text-destructive" />
      <h1 className="text-lg font-semibold">خطایی رخ داد</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        مشکلی در نمایش این بخش پیش آمد. دوباره تلاش کنید.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        تلاش مجدد
      </button>
    </div>
  );
}
