"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "عمومی",
    items: [
      ["جستجو", "Ctrl / ⌘ + K"],
      ["ایجاد وظیفه", "C"],
      ["نمایش میانبرها", "?"],
    ],
  },
  {
    title: "پیمایش",
    items: [
      ["داشبورد", "G سپس D"],
      ["پروژه‌ها", "G سپس P"],
      ["کارهای من", "G سپس M"],
      ["برد (اولین پروژه)", "G سپس B"],
      ["گزارش‌ها", "G سپس R"],
      ["تقویم", "G سپس C"],
    ],
  },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>میانبرهای صفحه‌کلید</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{group.title}</h3>
              <ul className="space-y-1.5">
                {group.items.map(([label, keys]) => (
                  <li key={label} className="flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <kbd
                      dir="ltr"
                      className="rounded border border-border bg-secondary px-2 py-0.5 font-mono text-xs"
                    >
                      {keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
