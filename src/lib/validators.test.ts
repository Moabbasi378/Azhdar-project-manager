import { describe, expect, it } from "vitest";
import { createIssueSchema, createProjectSchema, createUserSchema } from "@/lib/validators";

describe("projectKeySchema", () => {
  it("accepts uppercase alphanumeric keys", () => {
    expect(createProjectSchema.shape.key.safeParse("GIR1").success).toBe(true);
  });

  it("rejects lowercase, short, or symbol keys", () => {
    expect(createProjectSchema.shape.key.safeParse("gir").success).toBe(false);
    expect(createProjectSchema.shape.key.safeParse("G").success).toBe(false);
    expect(createProjectSchema.shape.key.safeParse("GI-R").success).toBe(false);
  });
});

describe("createIssueSchema", () => {
  const base = { projectId: "p1", title: "یک وظیفه" };

  it("accepts a minimal issue", () => {
    expect(createIssueSchema.safeParse(base).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(createIssueSchema.safeParse({ ...base, title: "" }).success).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(createIssueSchema.safeParse({ ...base, type: "FEATURE" }).success).toBe(false);
  });

  it("rejects negative story points", () => {
    expect(createIssueSchema.safeParse({ ...base, storyPoints: -1 }).success).toBe(false);
  });

  it("coerces ISO date strings for dueAt", () => {
    const res = createIssueSchema.safeParse({ ...base, dueAt: new Date().toISOString() });
    expect(res.success).toBe(true);
  });
});

describe("createUserSchema", () => {
  it("requires a strong password and valid email", () => {
    expect(
      createUserSchema.safeParse({
        firstName: "علی",
        lastName: "رضایی",
        email: "ali@example.com",
        password: "12345678",
        role: "DEVELOPER",
      }).success,
    ).toBe(true);
    expect(
      createUserSchema.safeParse({
        firstName: "علی",
        lastName: "رضایی",
        email: "not-an-email",
        password: "12345678",
        role: "DEVELOPER",
      }).success,
    ).toBe(false);
    expect(
      createUserSchema.safeParse({
        firstName: "علی",
        lastName: "رضایی",
        email: "ali@example.com",
        password: "short",
        role: "DEVELOPER",
      }).success,
    ).toBe(false);
  });
});
