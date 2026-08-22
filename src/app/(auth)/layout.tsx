import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2.5">
        <Image
          src="/logo.png"
          alt="اژدر"
          width={40}
          height={40}
          className="size-10 rounded-xl shadow-lg shadow-primary/25"
        />
        <div>
          <h1 className="text-xl font-bold leading-tight">اژدر</h1>
          <p className="text-xs text-muted-foreground">مدیریت چابک پروژه‌ها</p>
        </div>
      </div>
      {children}
    </div>
  );
}
