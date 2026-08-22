"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TooltipProvider } from "@/components/ui/popover";
import { Sidebar } from "@/components/layout/sidebar";
import { Header, type HeaderUser } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandMenu } from "@/components/command-menu";
import { QuickCreateDialog } from "@/components/issues/quick-create-dialog";
import { ShortcutsDialog } from "@/components/layout/shortcuts-dialog";
import { IssueDrawerProvider } from "@/components/issues/issue-drawer";
import { Toaster } from "@/components/ui/sonner";

export type ShellProject = { id: string; key: string; name: string; icon: string };

type ShellContextValue = {
  user: HeaderUser;
  projects: ShellProject[];
  openCommandMenu: () => void;
  openQuickCreate: (projectId?: string) => void;
  openShortcuts: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);



export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within AppShell");
  return ctx;
}

export function AppShell({
  user,
  projects,
  unreadCount,
  children,
}: {
  user: HeaderUser;
  projects: ShellProject[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateProject, setQuickCreateProject] = useState<string | undefined>();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const openCommandMenu = useCallback(() => setCommandOpen(true), []);
  const openQuickCreate = useCallback((projectId?: string) => {
    setQuickCreateProject(projectId);
    setQuickCreateOpen(true);
  }, []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);

  useEffect(() => {
    let gPressed = false;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (e.key === "g") {
        gPressed = true;
        setTimeout(() => (gPressed = false), 1200);
        return;
      }
      if (gPressed) {
        gPressed = false;
        switch (e.key.toLowerCase()) {
          case "d": router.push("/dashboard"); break;
          case "p": router.push("/projects"); break;
          case "m": router.push("/my-work"); break;
          case "b": {
            const first = projects[0];
            if (first) router.push(`/projects/${first.key}/board`);
            break;
          }
          case "r": router.push("/reports"); break;
          case "c": router.push("/calendar"); break;
        }
        return;
      }
      if (e.key === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setQuickCreateProject(undefined);
        setQuickCreateOpen(true);
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, projects]);

  return (
    <ShellContext.Provider value={{ user, projects, openCommandMenu, openQuickCreate, openShortcuts }}>
      <IssueDrawerProvider>
        <TooltipProvider>
          <div className="flex h-dvh overflow-hidden">
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex">
              <Sidebar projects={projects} />
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
              <Header user={user} unreadCount={unreadCount} />
              <main className="min-h-0 flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
            </div>
          </div>
          <MobileNav />
          <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
          <QuickCreateDialog
            open={quickCreateOpen}
            onOpenChange={setQuickCreateOpen}
            defaultProjectId={quickCreateProject}
          />
          <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
          <Toaster />
        </TooltipProvider>
      </IssueDrawerProvider>
    </ShellContext.Provider>
  );
}
