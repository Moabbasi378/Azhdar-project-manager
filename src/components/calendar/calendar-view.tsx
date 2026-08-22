"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IssueTypeIcon } from "@/components/issues/issue-type-icon";
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS_SHORT,
  formatJalali,
  jalaliMonthLength,
  jalaliToDate,
  toJalali,
  toPersianDigits,
} from "@/lib/jalali";
import { cn } from "@/lib/utils";

export type CalendarIssue = {
  id: string;
  key: string;
  title: string;
  type: "EPIC" | "STORY" | "TASK" | "BUG" | "SUBTASK";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueAt: string;
  done: boolean;
  assignee: { id: string; firstName: string; lastName: string; avatarColor: string } | null;
};

export function CalendarView({
  issues,
  initialDate,
}: {
  issues: CalendarIssue[];
  initialDate?: Date;
}) {
  const router = useRouter();
  const [jy, jm] = useMemo(() => {
    const j = toJalali(initialDate ?? new Date());
    return [j.jy, j.jm] as const;
  }, [initialDate]);
  const nowJ = useMemo(() => toJalali(new Date()), []);
  const [year, setYear] = useState(jy);
  const [month, setMonth] = useState(jm);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const weeks = useMemo(() => {
    const monthLength = jalaliMonthLength(year, month);
    // weekday of the 1st: Persian week starts Saturday (=0)
    const firstDate = jalaliToDate(year, month, 1);
    const firstDow = (firstDate.getDay() + 1) % 7; // JS: Sun=0..Sat=6 → Sat=0
    const cells: ({ day: number; date: Date } | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= monthLength; d++) cells.push({ day: d, date: jalaliToDate(year, month, d) });
    while (cells.length % 7 !== 0) cells.push(null);
    const out: ({ day: number; date: Date } | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [year, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarIssue[]>();
    for (const issue of issues) {
      const j = toJalali(new Date(issue.dueAt));
      const k = `${j.jy}-${j.jm}-${j.jd}`;
      const list = map.get(k) ?? [];
      list.push(issue);
      map.set(k, list);
    }
    return map;
  }, [issues]);


  function prev() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else setMonth(month - 1);
    setSelectedDay(null);
  }
  function next() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else setMonth(month + 1);
    setSelectedDay(null);
  }

  const selectedIssues =
    selectedDay !== null ? byDay.get(`${year}-${month}-${selectedDay}`) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">
          {JALALI_MONTHS[month - 1]} {toPersianDigits(year)}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={prev} aria-label="ماه قبل">
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setYear(nowJ.jy);
              setMonth(nowJ.jm);
              setSelectedDay(null);
            }}
          >
            امروز
          </Button>
          <Button variant="outline" size="icon-sm" onClick={next} aria-label="ماه بعد">
            <ChevronLeft />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-secondary/40 text-center text-[11px] font-medium text-muted-foreground">
          {JALALI_WEEKDAYS_SHORT.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((cell, idx) => {
            if (!cell) return <div key={idx} className="min-h-20 border-b border-l border-border/60 bg-secondary/20" />;
            const isToday =
              cell.day === nowJ.jd && month === nowJ.jm && year === nowJ.jy;
            const dayIssues = byDay.get(`${year}-${month}-${cell.day}`) ?? [];
            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(selectedDay === cell.day ? null : cell.day)}
                className={cn(
                  "min-h-20 border-b border-l border-border/60 p-1.5 text-right align-top transition-colors hover:bg-accent/40",
                  selectedDay === cell.day && "bg-accent/60",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs",
                    isToday && "bg-primary font-bold text-primary-foreground",
                  )}
                >
                  {toPersianDigits(cell.day)}
                </span>
                <span className="mt-1 block space-y-0.5">
                  {dayIssues.slice(0, 2).map((issue) => (
                    <span
                      key={issue.id}
                      className={cn(
                        "block truncate rounded px-1 py-0.5 text-[10px]",
                        issue.done
                          ? "bg-success/10 text-success line-through"
                          : issue.priority === "CRITICAL"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {issue.title}
                    </span>
                  ))}
                  {dayIssues.length > 2 && (
                    <span className="block text-[10px] text-muted-foreground">
                      +{toPersianDigits(dayIssues.length - 2)} مورد دیگر
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay !== null && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">
            وظایف {formatJalali(jalaliToDate(year, month, selectedDay))}
          </h3>
          {selectedIssues.length === 0 ? (
            <p className="text-xs text-muted-foreground">وظیفه‌ای برای این روز نیست.</p>
          ) : (
            <ul className="divide-y divide-border">
              {selectedIssues.map((issue) => (
                <li key={issue.id}>
                  <button
                    onClick={() => router.push(`/issue/${issue.key}`)}
                    className="flex w-full items-center gap-2 py-2 text-sm transition-colors hover:text-primary"
                  >
                    <IssueTypeIcon type={issue.type} />
                    <span dir="ltr" className="font-mono text-[11px] text-muted-foreground">{issue.key}</span>
                    <span className={cn("truncate", issue.done && "line-through opacity-60")}>{issue.title}</span>
                    <span className="mr-auto flex shrink-0 items-center gap-2">
                      <Badge variant={issue.done ? "success" : "outline"}>
                        {issue.done ? "انجام شده" : "باز"}
                      </Badge>
                      {issue.assignee && <Avatar {...issue.assignee} size="xs" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
