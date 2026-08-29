import * as XLSX from "xlsx";
import { toEnglishDigits } from "@/lib/jalali";
import type { IssueType, Priority } from "@/generated/prisma/client";

export type ParsedIssue = {
  /** 1-based row number inside the sheet (for error messages). */
  row: number;
  title: string;
  type: IssueType;
  priority: Priority;
  storyPoints: number | null;
  estimatedMinutes: number | null;
  description: string | null;
  /** Raw free-text assignee from the sheet. */
  assignee: string | null;
  /** Resolved in `resolveAssignees`. */
  assigneeId: string | null;
  /** Persian error message when the row cannot be imported. */
  error?: string;
};

export type IssueImportMember = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
};

const VOID = "";

// ─── Header detection ─────────────────────────────────────────────

const normalizeHeader = (value: unknown): string =>
  toEnglishDigits(String(value ?? "").trim().toLowerCase())
    .replace(/[\u200c\u200e\u200f]/g, "")
    .replace(/[\s\-_./()[\]#]+/g, VOID);

const HEADER_ALIASES: Record<"title" | "type" | "priority" | "storyPoints" | "estimatedHours" | "description" | "assignee", string[]> = {
  title: ["عنوان", "title", "تیتر", "subject", "نام", "name"],
  type: ["نوع", "type", "kind", "نوع‌وظیفه"],
  priority: ["اولویت", "priority", "درجه‌اهمیت", "اهمیت"],
  storyPoints: ["استوری‌پوینت", "storypoints", "storypoint", "امتیاز", "points", "point", "نمره", "sp"],
  estimatedHours: ["زمان‌تخمینی", "estimated", "estimatedtime", "تخمین", "ساعت", "timeestimate", "hours", "hour", "زمان"],
  description: ["توضیحات", "description", "desc", "توضیح", "شرح", "details"],
  assignee: ["مسئول", "assignee", "owner", "assign", "کارشناس", "کاربر"],
};

type IndexMap = { [K in keyof typeof HEADER_ALIASES]: number | null };

const normalizedAliases = ((): Record<keyof typeof HEADER_ALIASES, string[]> => {
  const out = {} as Record<keyof typeof HEADER_ALIASES, string[]>;
  for (const [key, list] of Object.entries(HEADER_ALIASES) as [keyof typeof HEADER_ALIASES, string[]][]) {
    out[key] = list.map((a) => toEnglishDigits(a).replace(/[\u200c\u200e\u200f\s\-]/g, VOID).toLowerCase());
  }
  return out;
})();

function detectColumns(headerRow: (string | number)[]): IndexMap {
  const indexes: IndexMap = {
    title: null,
    type: null,
    priority: null,
    storyPoints: null,
    estimatedHours: null,
    description: null,
    assignee: null,
  };
  const normalized = headerRow.map(normalizeHeader);
  for (const [key, aliases] of Object.entries(normalizedAliases) as [keyof IndexMap, string[]][]) {
    let best: { len: number; col: number } | null = null;
    for (let i = 0; i < normalized.length; i++) {
      const header = normalized[i];
      for (const alias of aliases) {
        // equal header or a header that starts with the alias (handles
        // suffixes like "(ساعت)" or "وظیفه" without substring false-positives)
        if (alias.length > 0 && header.startsWith(alias) && (!best || alias.length > best.len)) {
          best = { len: alias.length, col: i };
        }
      }
    }
    if (best) indexes[key] = best.col;
  }
  return indexes;
}

function findHeaderRow(rows: (string | number)[][]): number {
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    if (detectColumns(rows[i]).title !== null) return i;
  }
  return 0;
}

// ─── Cell & value normalization ───────────────────────────────────

function cellText(value: unknown): string {
  if (value === null || value === undefined) return VOID;
  return toEnglishDigits(String(value).trim()).replace(/[\u200c\u200e\u200f]/g, VOID);
}

/** Raw cell text for free-text fields — keeps Persian digits as typed. */
function cellString(value: unknown): string {
  if (value === null || value === undefined) return VOID;
  return String(value).trim().replace(/[\u200c\u200e\u200f]/g, VOID);
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = cellText(value).replace(/,/g, VOID);
  if (cleaned === VOID) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

const TYPE_VALUES: Record<string, IssueType> = {
  epic: "EPIC", "اپیک": "EPIC",
  story: "STORY", "داستان": "STORY", "استوری": "STORY",
  task: "TASK", "وظیفه": "TASK", "کار": "TASK", "تسک": "TASK",
  bug: "BUG", "باگ": "BUG", "خطا": "BUG",
  subtask: "SUBTASK", "زیروظیفه": "SUBTASK", "زیر وظیفه": "SUBTASK",
};

const PRIORITY_VALUES: Record<string, Priority> = {
  low: "LOW", "کم": "LOW", "پایین": "LOW", lowest: "LOW",
  medium: "MEDIUM", "متوسط": "MEDIUM", mid: "MEDIUM", "میان": "MEDIUM", normal: "MEDIUM",
  high: "HIGH", "زیاد": "HIGH", "بالا": "HIGH", urgent: "HIGH",
  critical: "CRITICAL", "بحرانی": "CRITICAL", "فوری": "CRITICAL",
};

const normalizeValue = (value: unknown): string => {
  const t = cellText(value).trim().toLowerCase().replace(/\s+/g, " ");
  return t.replace(/[\u200c\u200e\u200f]/g, VOID);
};

/** Build an issue row flagged with an error (assigneeId defaults to null). */
function errorRow(
  row: number,
  extra: Partial<ParsedIssue> & { error: string },
): ParsedIssue {
  return {
    row,
    title: "",
    type: "TASK",
    priority: "MEDIUM",
    storyPoints: null,
    estimatedMinutes: null,
    description: null,
    assignee: null,
    assigneeId: null,
    ...extra,
  };
}

// ─── Public API ───────────────────────────────────────────────────

/** Parse the first worksheet of an .xlsx/.xls workbook into import rows. */
export function parseWorkbook(input: ArrayBuffer | Uint8Array): ParsedIssue[] {
  const wb = XLSX.read(input, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];

  const raw = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: VOID,
    raw: true,
  });
  const rows: (string | number)[][] = raw as (string | number)[][];

  const headerIndex = findHeaderRow(rows);
  const cols = detectColumns(rows[headerIndex]);

  if (cols.title === null) {
    throw new Error("FILE_HAS_NO_TITLE_COLUMN");
  }

  const issues: ParsedIssue[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    const isEmpty = r.every((cell) => String(cell ?? VOID).trim() === VOID);
    if (isEmpty) continue;

    const rowNum = i + 1; // excel-style
    const get = (col: number | null) => (col === null || col >= r.length ? VOID : r[col]);

    const title = cellString(get(cols.title));

    let type: IssueType = "TASK";
    let typeText = "";
    if (cols.type !== null) typeText = normalizeValue(get(cols.type));
    if (typeText) {
      const resolved = TYPE_VALUES[typeText];
      if (!resolved) {
        issues.push(errorRow(rowNum, { title, error: `نوع «${typeText}» نامعتبر است.` }));
        continue;
      }
      type = resolved;
    }

    let priority: Priority = "MEDIUM";
    let priorityText = "";
    if (cols.priority !== null) priorityText = normalizeValue(get(cols.priority));
    if (priorityText) {
      const resolved = PRIORITY_VALUES[priorityText];
      if (!resolved) {
        issues.push(errorRow(rowNum, { title, type, error: `اولویت «${priorityText}» نامعتبر است.` }));
        continue;
      }
      priority = resolved;
    }

    let storyPoints: number | null = null;
    if (cols.storyPoints !== null) {
      const rawPoints = get(cols.storyPoints);
      if (rawPoints !== VOID) {
        const n = parseNumber(rawPoints);
        if (n === null || !Number.isInteger(n) || n < 0 || n > 100) {
          issues.push(
            errorRow(rowNum, { title, type, priority, error: "استوری پوینت باید عددی بین ۰ تا ۱۰۰ باشد." }),
          );
          continue;
        }
        storyPoints = n;
      }
    }

    let estimatedMinutes: number | null = null;
    if (cols.estimatedHours !== null) {
      const rawHours = get(cols.estimatedHours);
      if (rawHours !== VOID) {
        const hours = parseNumber(rawHours);
        if (hours === null || hours < 0) {
          issues.push(
            errorRow(rowNum, { title, type, priority, storyPoints, estimatedMinutes: null, error: "زمان تخمینی باید عدد (به ساعت) باشد." }),
          );
          continue;
        }
        estimatedMinutes = Math.round(hours * 60);
      }
    }

    const description = cols.description !== null ? cellString(get(cols.description)) : VOID;
    const assignee = cols.assignee !== null ? cellString(get(cols.assignee)) : VOID;

    if (title.trim().length < 2) {
      issues.push(
        errorRow(rowNum, { title, type, priority, storyPoints, estimatedMinutes, description: description || null, assignee: assignee || null, error: "عنوان الزامی است." }),
      );
      continue;
    }

    issues.push({
      row: rowNum,
      title: title.trim(),
      type,
      priority,
      storyPoints,
      estimatedMinutes,
      description: description || null,
      assignee: assignee || null,
      assigneeId: null,
    });
  }

  return issues;
}

/** Resolve free-text assignees against project members (mutates rows). */
export function resolveAssignees(issues: ParsedIssue[], members: IssueImportMember[]): void {
  const byEmail = new Map<string, IssueImportMember>();
  const byFullName = new Map<string, IssueImportMember>();
  const byFirstName = new Map<string, IssueImportMember[]>();
  const byLastName = new Map<string, IssueImportMember[]>();
  const key = (s: string) => toEnglishDigits(s).replace(/[\s\u200c]/g, VOID).toLowerCase();

  for (const m of members) {
    if (m.email) byEmail.set(key(m.email), m);
    byFullName.set(key(`${m.firstName} ${m.lastName}`), m);
    byFullName.set(key(`${m.lastName} ${m.firstName}`), m);
    byFirstName.set(key(m.firstName), [...(byFirstName.get(key(m.firstName)) ?? []), m]);
    byLastName.set(key(m.lastName), [...(byLastName.get(key(m.lastName)) ?? []), m]);
  }

  for (const issue of issues) {
    if (!issue.assignee) continue;
    const k = key(issue.assignee);
    const member =
      byEmail.get(k) ??
      byFullName.get(k) ??
      (byFirstName.get(k)?.length === 1 ? byFirstName.get(k)![0] : undefined) ??
      (byLastName.get(k)?.length === 1 ? byLastName.get(k)![0] : undefined);

    if (!member) {
      issue.error = `مسئول «${issue.assignee}» در پروژه پیدا نشد.`;
    } else {
      issue.assigneeId = member.id;
    }
  }
}

/** Build & download an Excel template + one filled sample row (browser only). */
export function downloadXlsxTemplate(filename = "import-issues-template.xlsx"): void {
  const rows: (string | number)[][] = [
    ["عنوان", "نوع", "اولویت", "استوری پوینت", "زمان تخمینی (ساعت)", "توضیحات", "مسئول"],
    ["بازبینی صفحه ورود", "داستان", "بالا", 5, 8, "خطاهای اعتبارسنجی را اصلاح کنید", "نام عضو تیم"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 35 }, { wch: 15 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "وظایف");
  XLSX.writeFile(wb, filename);
}