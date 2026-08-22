import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toPersianDigits } from "@/lib/jalali";

export const metadata = { title: "گزارش‌ها" };

export default async function GlobalReportsPage() {
  const user = await requireUser();

  const projects =
    user.role === "OWNER"
      ? await prisma.project.findMany({ where: { state: "ACTIVE" }, select: { id: true, key: true, name: true, icon: true } })
      : await prisma.project.findMany({
          where: { state: "ACTIVE", members: { some: { userId: user.id } } },
          select: { id: true, key: true, name: true, icon: true },
        });
  const projectIds = projects.map((p) => p.id);

  const [perProject, workload] = await Promise.all([
    Promise.all(
      projects.map(async (p) => {
        const [total, done, bugs] = await Promise.all([
          prisma.issue.count({ where: { projectId: p.id } }),
          prisma.issue.count({ where: { projectId: p.id, status: { category: "DONE" } } }),
          prisma.issue.count({
            where: { projectId: p.id, type: "BUG", status: { category: { not: "DONE" } } },
          }),
        ]);
        return { ...p, total, done, bugs };
      }),
    ),
    prisma.issue.groupBy({
      by: ["assigneeId"],
      where: {
        projectId: { in: projectIds },
        status: { category: { not: "DONE" } },
        assigneeId: { not: null },
      },
      _count: true,
    }),
  ]);

  const assigneeIds = workload.map((w) => w.assigneeId!);
  const users = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, firstName: true, lastName: true, avatarColor: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const workloadRows = workload
    .map((w) => ({ user: userMap.get(w.assigneeId!)!, count: w._count }))
    .filter((r) => r.user)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const maxWorkload = Math.max(1, ...workloadRows.map((r) => r.count));

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
      <h1 className="text-xl font-bold">گزارش‌های کلی</h1>

      {/* Per-project table */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">وضعیت پروژه‌ها</h2>
        {perProject.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            پروژه‌ای در دسترس نیست.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-right font-medium">پروژه</th>
                  <th className="px-4 py-2.5 text-center font-medium">کل وظایف</th>
                  <th className="px-4 py-2.5 text-center font-medium">انجام شده</th>
                  <th className="px-4 py-2.5 text-center font-medium">باگ باز</th>
                  <th className="px-4 py-2.5 text-center font-medium">پیشرفت</th>
                </tr>
              </thead>
              <tbody>
                {perProject.map((p) => {
                  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                  return (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5">
                        <Link href={`/projects/${p.key}`} className="flex items-center gap-2 hover:text-primary">
                          <span>{p.icon}</span> {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{toPersianDigits(p.total)}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{toPersianDigits(p.done)}</td>
                      <td className="px-4 py-2.5 text-center">
                        {p.bugs > 0 ? (
                          <Badge variant="destructive">{toPersianDigits(p.bugs)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="mx-auto flex w-28 items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] tabular-nums text-muted-foreground">{toPersianDigits(pct)}٪</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Workload */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">بار کاری اعضا (وظایف باز)</h2>
        {workloadRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            داده‌ای برای نمایش نیست.
          </p>
        ) : (
          <ul className="space-y-2 rounded-xl border border-border bg-card p-4">
            {workloadRows.map((row) => (
              <li key={row.user.id} className="flex items-center gap-3">
                <Avatar {...row.user} size="sm" />
                <span className="w-32 truncate text-sm">
                  {row.user.firstName} {row.user.lastName}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((row.count / maxWorkload) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-left text-xs tabular-nums text-muted-foreground">
                  {toPersianDigits(row.count)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
