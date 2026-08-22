"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { DirectionProvider } from "@radix-ui/react-direction";
import type { ComponentProps } from "react";

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <DirectionProvider dir="rtl">
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        {...props}
      >
        {children}
      </NextThemesProvider>
    </DirectionProvider>
  );
}
