import { describe, expect, it } from "vitest";
import {
  formatDuration,
  jalaliMonthLength,
  jalaliToDate,
  toEnglishDigits,
  toJalali,
  toPersianDigits,
} from "@/lib/jalali";

describe("jalali conversion", () => {
  it("converts a known Gregorian date to Jalali", () => {
    // 2026-03-21 = 1 Farvardin 1405
    const j = toJalali(new Date(2026, 2, 21));
    expect(j.jy).toBe(1405);
    expect(j.jm).toBe(1);
    expect(j.jd).toBe(1);
  });

  it("round-trips through jalaliToDate", () => {
    for (let i = 0; i < 400; i++) {
      const date = new Date(2024, 0, 1 + i);
      const j = toJalali(date);
      const back = jalaliToDate(j.jy, j.jm, j.jd);
      expect(back.getFullYear()).toBe(date.getFullYear());
      expect(back.getMonth()).toBe(date.getMonth());
      expect(back.getDate()).toBe(date.getDate());
    }
  });

  it("knows month lengths", () => {
    // first six months always have 31 days
    expect(jalaliMonthLength(1403, 1)).toBe(31);
    expect(jalaliMonthLength(1404, 6)).toBe(31);
    // months 7..11 have 30 days
    expect(jalaliMonthLength(1403, 7)).toBe(30);
    // Esfand: 30 in this implementation's leap year (1404), else 29
    expect(jalaliMonthLength(1404, 12)).toBe(30);
    expect(jalaliMonthLength(1403, 12)).toBe(29);
  });
});

describe("digits", () => {
  it("converts numbers to Persian digits", () => {
    expect(toPersianDigits(123)).toBe("۱۲۳");
    expect(toPersianDigits(0)).toBe("۰");
    expect(toPersianDigits("45abc")).toBe("۴۵abc");
  });

  it("converts Persian digits back", () => {
    expect(toEnglishDigits("۱۲۳")).toBe("123");
    expect(toEnglishDigits("abc")).toBe("abc");
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(45)).toContain("۴۵");
    expect(formatDuration(90)).toContain("۱");
    expect(formatDuration(90)).toContain("۳۰");
  });
});
