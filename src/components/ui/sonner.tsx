"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      dir="rtl"
      toastOptions={{
        classNames: {
          toast:
            "!bg-popover !text-popover-foreground !border-border !rounded-lg !shadow-lg !font-sans",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
