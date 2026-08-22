import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CreateProjectButton } from "@/components/projects/create-project-button";
import { Badge } from "@/components/ui/badge";
import { formatJalali, toPersianDigits } from "@/lib/jalali";

export const metadata = { title: "پروژه‌ها" };

export default async function ProjectsPage() {
  const user = await requireUser();

  const projects = await prisma.project.findMany({
    where:
      user.role === "OWNER"
        ? {}
        : { members: { some: { userId: user.id } } },
    select: {
      id: true, key: true, name: true, description: true, icon: true,
      state: true, createdAt: true,
      _count: { select: { issues: true, members: true, sprints: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">پروژه‌ها</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {toPersianDigits(projects.length)} پروژه
          </p>
        </div>
        {(user.role === "OWNER" || user.role === "PROJECT_MANAGER") && (
          <CreateProjectButton />
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <FolderKanban className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="font-medium">هنوز هیچ پروژه‌ای وجود ندارد.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            اولین پروژه خود را ایجاد کنید تا شروع کنید.
          </p>
          {(user.role === "OWNER" || user.role === "PROJECT_MANAGER") && (
            <div className="mt-4 flex justify-center">
              <CreateProjectButton />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.key}/board`}
              className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{project.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold group-hover:text-primary">
                      {project.name}
                    </h2>
                    {project.state !== "ACTIVE" && (
                      <Badge variant={project.state === "ARCHIVED" ? "outline" : "success"}>
                        {project.state === "ARCHIVED" ? "بایگانی" : "تکمیل شده"}
                      </Badge>
                    )}
                  </div>
                  <p dir="ltr" className="mt-0.5 text-right font-mono text-[11px] text-muted-foreground">
                    {project.key}
                  </p>
                </div>
              </div>
              {project.description && (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {project.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                <span>{toPersianDigits(project._count.issues)} وظیفه</span>
                <span>{toPersianDigits(project._count.members)} عضو</span>
                <span>{toPersianDigits(project._count.sprints)} اسپرینت</span>
                <time className="mr-auto">{formatJalali(project.createdAt, "medium")}</time>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
