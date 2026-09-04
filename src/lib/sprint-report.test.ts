import { describe, expect, it } from "vitest";
import { buildSprintReport, type SprintReportInput } from "@/lib/sprint-report";

const DAY = 86_400_000;

function issue(overrides: Partial<SprintReportInput["issues"][number]> = {}) {
  return {
    id: overrides.id ?? "i1",
    key: overrides.key ?? "GIR-1",
    title: overrides.title ?? "وظیفه",
    type: overrides.type ?? "TASK",
    priority: overrides.priority ?? "MEDIUM",
    storyPoints: overrides.storyPoints ?? null,
    parentId: overrides.parentId ?? null,
    completedAt: overrides.completedAt ?? null,
    dueAt: overrides.dueAt ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01"),
    estimatedMinutes: overrides.estimatedMinutes ?? null,
    loggedMinutes: overrides.loggedMinutes ?? 0,
    status: overrides.status ?? { id: "s1", name: "انجام شده", category: "DONE" },
    assignee: overrides.assignee ?? null,
  };
}

function input(
  overrides: Partial<SprintReportInput> = {},
): SprintReportInput {
  return {
    sprint: {
      id: "sp1",
      name: "اسپرینت ۱",
      goal: null,
      state: "ACTIVE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-11"),
      ...overrides.sprint,
    },
    issues: overrides.issues ?? [],
  };
}

describe("buildSprintReport", () => {
  it("reports nothing for an empty sprint", () => {
    const report = buildSprintReport(input());
    expect(report.totals).toMatchObject({ issues: 0, done: 0, remaining: 0, points: 0 });
    expect(report.hasPoints).toBe(false);
    expect(report.burndown).toEqual([]);
    expect(report.completion.byCount).toBe(0);
  });

  it("uses story points when they exist", () => {
    const report = buildSprintReport(
      input({
        issues: [
          issue({ id: "a", storyPoints: 5, status: { id: "s1", name: "انجام شده", category: "DONE" }, completedAt: new Date("2026-01-03") }),
          issue({ id: "b", storyPoints: 3, status: { id: "s2", name: "برای انجام", category: "TODO" } }),
        ],
      }),
    );
    expect(report.hasPoints).toBe(true);
    expect(report.burndownMetric).toBe("POINTS");
    expect(report.totals.points).toBe(8);
    expect(report.totals.donePoints).toBe(5);
    expect(report.completion.byPoints).toBe(63);
    expect(report.burndown.at(-1)?.ideal).toBe(0);
  });

  it("still produces a full report when no issue has story points", () => {
    const report = buildSprintReport(
      input({
        issues: [
          issue({ id: "a", status: { id: "s1", name: "انجام شده", category: "DONE" }, completedAt: new Date("2026-01-04") }),
          issue({ id: "b", status: { id: "s2", name: "برای انجام", category: "TODO" } }),
          issue({ id: "c", status: { id: "s2", name: "برای انجام", category: "TODO" } }),
        ],
      }),
    );
    expect(report.hasPoints).toBe(false);
    expect(report.burndownMetric).toBe("ISSUES");
    expect(report.totals).toMatchObject({ issues: 3, done: 1, remaining: 2, points: 0 });
    expect(report.completion).toEqual({ byCount: 33, byPoints: null });
    // burndown counts issues instead of points
    expect(report.burndown.length).toBeGreaterThan(0);
    expect(report.burndown[0].ideal).toBe(3);
    expect(report.burndown.at(-1)?.ideal).toBe(0);
    expect(report.statusBreakdown).toHaveLength(2);
  });

  it("counts remaining work down as issues complete", () => {
    const start = new Date("2026-01-01");
    const report = buildSprintReport(
      input({
        sprint: { id: "sp1", name: "s", goal: null, state: "COMPLETED", startDate: start, endDate: new Date(start.getTime() + 4 * DAY) },
        issues: [
          issue({ id: "a", status: { id: "s1", name: "انجام شده", category: "DONE" }, completedAt: new Date(start.getTime() + 1 * DAY) }),
          issue({ id: "b", status: { id: "s1", name: "انجام شده", category: "DONE" }, completedAt: new Date(start.getTime() + 3 * DAY) }),
        ],
      }),
    );
    expect(report.burndown.map((p) => p.actual)).toEqual([2, 1, 1, 0, 0]);
  });

  it("excludes subtasks from the sprint totals but reports them separately", () => {
    const report = buildSprintReport(
      input({
        issues: [
          issue({ id: "a", status: { id: "s1", name: "انجام شده", category: "DONE" } }),
          issue({ id: "sub", parentId: "a", status: { id: "s2", name: "برای انجام", category: "TODO" } }),
        ],
      }),
    );
    expect(report.totals.issues).toBe(1);
    expect(report.subtasks).toEqual({ total: 1, done: 0 });
  });

  it("groups issues by assignee and marks unassigned ones", () => {
    const dev = {
      id: "u1",
      firstName: "علی",
      lastName: "رضایی",
      avatarColor: "#fff",
      avatarImage: null,
      avatarIcon: null,
    };
    const report = buildSprintReport(
      input({
        issues: [
          issue({ id: "a", assignee: dev, status: { id: "s1", name: "انجام شده", category: "DONE" } }),
          issue({ id: "b", assignee: dev, status: { id: "s2", name: "برای انجام", category: "TODO" } }),
          issue({ id: "c" }),
        ],
      }),
    );
    expect(report.assignees).toHaveLength(2);
    expect(report.assignees[0]).toMatchObject({ total: 2, done: 1 });
    expect(report.assignees[1].user).toBeNull();
  });

  it("falls back to issue dates when the sprint has no dates", () => {
    const report = buildSprintReport(
      input({
        sprint: { id: "sp1", name: "s", goal: null, state: "PLANNED", startDate: null, endDate: null },
        issues: [
          issue({ id: "a", createdAt: new Date("2026-02-01"), status: { id: "s2", name: "برای انجام", category: "TODO" } }),
        ],
      }),
    );
    expect(report.burndown.length).toBeGreaterThan(1);
    expect(report.burndown[0].ideal).toBe(1);
  });
});
