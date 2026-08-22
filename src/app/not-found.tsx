import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-bold text-primary">۴۰۴</p>
      <h1 className="text-lg font-semibold">صفحه پیدا نشد</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        صفحه‌ای که دنبالش بودید وجود ندارد یا جابه‌جا شده است.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        بازگشت به داشبورد
      </Link>
    </div>
  );
}
