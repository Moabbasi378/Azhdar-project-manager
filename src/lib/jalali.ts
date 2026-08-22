/**
 * Jalali (Solar Hijri) calendar conversion + Persian formatting.
 * Based on the well-known jalaali algorithm (Behrooz Kamali & friends, MIT).
 */

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export const JALALI_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;
/** Saturday-first weekday names, index 0 = شنبه */
export const JALALI_WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toEnglishDigits(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 1701, 1749,
    1770, 1785, 1868, 1944, 2031, 2116, 2122, 2157, 2183,
  ];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  if (jy < jp || jy >= breaks[bl - 1]) throw new Error("Invalid Jalali year " + jy);

  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(jump % 33, 4);
    jp = jm;
  }
  let n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div((n % 33) + 3, 4);
  if (jump % 33 === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;

  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = (((n + 1) % 33) - 1) % 4;
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * ((gm + 9) % 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div((j % 1461) / 4, 1) * 5 + 308;
  const gd = div((i % 153) / 5, 1) + 1;
  const gm = (div(i, 153) % 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): { jy: number; jm: number; jd: number } {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      const jm = 1 + div(k, 31);
      const jd = (k % 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  const jm = 7 + div(k, 30);
  const jd = (k % 30) + 1;
  return { jy, jm, jd };
}

export function toJalali(date: Date): { jy: number; jm: number; jd: number } {
  return d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

export function jalaliToDate(jy: number, jm: number, jd: number): Date {
  const g = d2g(j2d(jy, jm, jd));
  return new Date(g.gy, g.gm - 1, g.gd);
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy).leap === 1 ? 30 : 29;
}

// ─── Formatting ──────────────────────────────────────────────────

export type JalaliFormat =
  | "full" // ۲۷ مرداد ۱۴۰۵
  | "fullWeekday" // چهارشنبه ۲۷ مرداد ۱۴۰۵
  | "medium" // ۲۷ مرداد
  | "numeric" // ۱۴۰۵/۰۵/۲۷
  | "dayMonth" // ۲۷ مرداد
  | "monthYear"; // مرداد ۱۴۰۵

export function formatJalali(date: Date | string | number, format: JalaliFormat = "full"): string {
  const d = typeof date === "object" ? date : new Date(date);
  const { jy, jm, jd } = toJalali(d);
  switch (format) {
    case "full":
      return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
    case "fullWeekday":
      return `${JALALI_WEEKDAYS[(d.getDay() + 1) % 7]} ${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
    case "medium":
    case "dayMonth":
      return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]}`;
    case "numeric":
      return toPersianDigits(
        `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`,
      );
    case "monthYear":
      return `${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
  }
}

export function formatJalaliDateTime(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatJalali(d)}، ${toPersianDigits(hh)}:${toPersianDigits(mm)}`;
}

/** Relative time in Persian: «۳ روز پیش» / «۲ ساعت دیگر» */
export function formatRelative(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const future = diffMs > 0;
  const suffix = future ? "دیگر" : "پیش";

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return future ? "لحظه‌ای دیگر" : "همین حالا";
  if (abs < hour) return `${toPersianDigits(Math.round(abs / minute))} دقیقه ${suffix}`;
  if (abs < day) return `${toPersianDigits(Math.round(abs / hour))} ساعت ${suffix}`;
  if (abs < 30 * day) return `${toPersianDigits(Math.round(abs / day))} روز ${suffix}`;
  if (abs < 365 * day) return `${toPersianDigits(Math.round(abs / (30 * day)))} ماه ${suffix}`;
  return `${toPersianDigits(Math.round(abs / (365 * day)))} سال ${suffix}`;
}

/** Days remaining until due date (negative = overdue). */
export function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86_400_000);
}

/** Format a duration in minutes as Persian text: «۲ ساعت و ۳۰ دقیقه» */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "۰ دقیقه";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${toPersianDigits(h)} ساعت`);
  if (m > 0) parts.push(`${toPersianDigits(m)} دقیقه`);
  return parts.join(" و ");
}
