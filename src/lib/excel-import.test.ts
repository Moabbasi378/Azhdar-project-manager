import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseWorkbook, resolveAssignees } from "@/lib/excel-import";

function toWorkbook(rows: (string | number)[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "وظایف");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("parseWorkbook", () => {
  it("parses a simple sheet", () => {
    const buf = toWorkbook([
      ["عنوان", "نوع", "اولویت", "استوری پوینت", "زمان تخمینی (ساعت)", "توضیحات", "مسئول"],
      ["اصلاح صفحه ورود", "باگ", "بحرانی", 8, 4, "خطای ۵۰۰", "علی احمدی"],
      ["افزودن گزارش", "داستان", "زیاد", 13, 10, "", ""],
    ]);
    const issues = parseWorkbook(buf);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({
      row: 2,
      title: "اصلاح صفحه ورود",
      type: "BUG",
      priority: "CRITICAL",
      storyPoints: 8,
      estimatedMinutes: 240,
      description: "خطای ۵۰۰",
      assignee: "علی احمدی",
    });
    expect(issues[1]).toMatchObject({ type: "STORY", priority: "HIGH", storyPoints: 13 });
  });

  it("defaults type/priority and skips blank rows", () => {
    const buf = toWorkbook([
      ["Title", "Type", "Priority"],
      ["task one"],
      [""],
      ["task two", "EPIC", "LOW"],
    ]);
    const issues = parseWorkbook(buf);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({ row: 2, title: "task one", type: "TASK", priority: "MEDIUM" });
    expect(issues[1]).toMatchObject({ row: 4, title: "task two", type: "EPIC", priority: "LOW" });
  });

  it("finds the header row even with a title row above it", () => {
    const buf = toWorkbook([
      ["برنامه کاری خرداد"],
      ["وظیفهها"],
      ["عنوان", "نوع", "اولویت", "امتیاز"],
      ["ایجاد پنل کاربری", "STORY", "MEDIUM", 5],
    ]);
    const issues = parseWorkbook(buf);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ row: 4, title: "ایجاد پنل کاربری", storyPoints: 5 });
  });

  it("converts Persian digits in numeric cells", () => {
    const buf = toWorkbook([
      ["عنوان", "استوری پوینت", "زمان تخمینی (ساعت)"],
      ["وظیفه با رقم فارسی", "۵", "۳"],
    ]);
    const issues = parseWorkbook(buf);
    expect(issues[0].storyPoints).toBe(5);
    expect(issues[0].estimatedMinutes).toBe(180);
  });

  it("reports invalid type / priority / points / missing title rows with an error", () => {
    const buf = toWorkbook([
      ["عنوان", "نوع", "اولویت", "استوری پوینت"],
      ["بدون نوع", "ناشناخته"],
      ["بدون اولویت", "", "نامشخص"],
      ["بدون امتیاز", "", "", 101],
      ["ا"],
    ]);
    const issues = parseWorkbook(buf);
    expect(issues).toHaveLength(4);
    expect(issues[0].error).toContain("نوع");
    expect(issues[1].error).toContain("اولویت");
    expect(issues[2].error).toContain("استوری پوینت");
    expect(issues[3].error).toContain("عنوان");
  });

  it("throws when no title column is recognized", () => {
    const buf = toWorkbook([
      ["فقط", "چند", "ستون"],
      ["۱", "۲", "۳"],
    ]);
    expect(() => parseWorkbook(buf)).toThrow("FILE_HAS_NO_TITLE_COLUMN");
  });
});

describe("resolveAssignees", () => {
  const members = [
    { id: "u1", firstName: "علی", lastName: "احمدی", email: "ali@example.com" },
    { id: "u2", firstName: "مریم", lastName: "کریمی", email: "maryam@example.com" },
    { id: "u3", firstName: "علی", lastName: "رضایی", email: "ali2@example.com" },
  ];

  function row(assignee: string, error?: string) {
    return { row: 2, title: "x", type: "TASK" as const, priority: "MEDIUM" as const, storyPoints: null, estimatedMinutes: null, description: null, assignee, assigneeId: null, error };
  }

  it("resolves by full name, unique first name and email", () => {
    const issues = [
      row("علی احمدی"),
      row("مریم"),
      row("ali2@example.com"),
      row("علی رضایی"),
    ];
    resolveAssignees(issues, members);
    expect(issues.map((i) => i.assigneeId)).toEqual(["u1", "u2", "u3", "u3"]);
    expect(issues.every((i) => !i.error)).toBe(true);
  });

  it("flags ambiguous first names that are not unique", () => {
    const issues = [row("علی")];
    resolveAssignees(issues, members);
    expect(issues[0].assigneeId).toBeNull();
    expect(issues[0].error).toContain("علی");
  });

  it("flags unknown assignees", () => {
    const issues = [row("کسی نیست")];
    resolveAssignees(issues, members);
    expect(issues[0].assigneeId).toBeNull();
    expect(issues[0].error).toContain("کسی نیست");
  });
});