"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatJalali, toPersianDigits } from "@/lib/jalali";

export type BurndownSprint = {
  id: string;
  name: string;
  state: "PLANNED" | "ACTIVE" | "COMPLETED";
  startDate: string | null;
  endDate: string | null;
};

export type VelocityPoint = { name: string; completed: number; committed: number };

export function ReportsView({
  sprints,
  burndown,
  burndownUnit = {},
  velocity,
  velocityUnit = "POINTS",
}: {
  sprints: BurndownSprint[];
  /** per selected sprint: [{dayLabel, ideal, actual}] */
  burndown: Record<string, { day: string; ideal: number; actual: number | null }[]>;
  /** per sprint: "POINTS" when it has story points, otherwise "ISSUES" */
  burndownUnit?: Record<string, "POINTS" | "ISSUES">;
  velocity: VelocityPoint[];
  velocityUnit?: "POINTS" | "ISSUES";
}) {
  const withBurndown = sprints.filter((s) => burndown[s.id]?.length);
  const [selectedId, setSelectedId] = useState(
    () => sprints.find((s) => s.state === "ACTIVE")?.id ?? withBurndown[0]?.id ?? "",
  );
  const data = useMemo(() => burndown[selectedId] ?? [], [burndown, selectedId]);
  const selected = sprints.find((s) => s.id === selectedId);
  const burndownLabel =
    burndownUnit[selectedId] === "ISSUES" ? "وظیفه باقی‌مانده" : "امتیاز باقی‌مانده";

  const fa = (v: number | string) => toPersianDigits(v);

  return (
    <div className="space-y-8">
      {/* Sprint selector */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-muted-foreground">اسپرینت:</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          dir="rtl"
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          {sprints.length === 0 && <option value="">اسپرینتی نیست</option>}
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.state === "ACTIVE" ? " (فعال)" : s.state === "COMPLETED" ? " (تکمیل شده)" : ""}
            </option>
          ))}
        </select>
        {selected?.startDate && selected.endDate && (
          <span className="text-xs text-muted-foreground">
            {formatJalali(new Date(selected.startDate))} تا {formatJalali(new Date(selected.endDate))}
          </span>
        )}
      </div>

      {/* Burndown */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">نمودار بِرنداون ({burndownLabel})</h3>
        {data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            برای این اسپرینت داده‌ای وجود ندارد.
          </p>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4" dir="ltr">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => fa(v)}
                  stroke="var(--muted-foreground)"
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fa(v)} stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip
                  formatter={(value) => fa(value as number)}
                  labelFormatter={(l) => `روز ${fa(Number(l))}`}
                  contentStyle={{ direction: "rtl", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                />
                <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v === "ideal" ? "خط ایده‌آل" : "واقعی"}</span>} />
                <Line type="monotone" dataKey="ideal" stroke="var(--muted-foreground)" strokeDasharray="6 4" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="actual" stroke="var(--primary)" strokeWidth={2} connectNulls={false} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Velocity */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">
          سرعت تیم در اسپرینت‌ها ({velocityUnit === "ISSUES" ? "تعداد وظایف" : "استوری پوینت"})
        </h3>
        {velocity.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            هنوز اسپرینت تکمیل‌شده‌ای وجود ندارد.
          </p>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4" dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={velocity} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fa(v)} stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip
                  formatter={(value) => fa(value as number)}
                  contentStyle={{ direction: "rtl", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                />
                <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v === "committed" ? "تعهد شده" : "تکمیل شده"}</span>} />
                <Bar dataKey="committed" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
