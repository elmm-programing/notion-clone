"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getCellValue, type ValueMap } from "@/lib/db";
import type { DbProperty, Page } from "@/types/database";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function CalendarView({
  dateProperty,
  dateProperties,
  rows,
  valueMap,
  onSetDateProp,
  onOpenRow,
  onCreateOnDate,
}: {
  dateProperty: DbProperty | null;
  dateProperties: DbProperty[];
  rows: Page[];
  valueMap: ValueMap;
  onSetDateProp: (propertyId: string | null) => void;
  onOpenRow: (rowId: string) => void;
  onCreateOnDate: (date: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const rowsByDate = useMemo(() => {
    const map = new Map<string, Page[]>();
    if (!dateProperty) return map;
    for (const row of rows) {
      const v = getCellValue(row, dateProperty.id, valueMap);
      if (typeof v === "string" && v) {
        if (!map.has(v)) map.set(v, []);
        map.get(v)!.push(row);
      }
    }
    return map;
  }, [rows, dateProperty, valueMap]);

  if (!dateProperty) {
    return (
      <div className="text-sm text-muted-foreground">
        {dateProperties.length === 0 ? (
          <p>Add a “date” property to use the calendar.</p>
        ) : (
          <label className="flex items-center gap-2">
            Date field
            <select
              defaultValue=""
              onChange={(e) => onSetDateProp(e.target.value || null)}
              className="rounded border border-border bg-background px-2 py-1 text-sm outline-none"
            >
              <option value="" disabled>
                Choose a date property…
              </option>
              {dateProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    );
  }

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const todayStr = fmt(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm">
        <button onClick={prevMonth} className="rounded p-1 hover:bg-accent">
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-40 text-center font-medium">
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} className="rounded p-1 hover:bg-accent">
          <ChevronRight size={16} />
        </button>
        <button
          onClick={goToday}
          className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent"
        >
          Today
        </button>
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Date field
          <select
            value={dateProperty.id}
            onChange={(e) => onSetDateProp(e.target.value || null)}
            className="rounded border border-border bg-background px-2 py-1 outline-none"
          >
            {dateProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </span>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-r border-b border-border px-2 py-1 text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const dateStr = day != null ? fmt(year, month, day) : null;
          const dayRows = dateStr ? (rowsByDate.get(dateStr) ?? []) : [];
          return (
            <div
              key={i}
              className={`group min-h-24 border-r border-b border-border p-1 ${
                day == null ? "bg-muted/30" : ""
              }`}
            >
              {day != null && (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-xs ${
                        dateStr === todayStr
                          ? "rounded bg-foreground px-1 text-background"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day}
                    </span>
                    <button
                      onClick={() => dateStr && onCreateOnDate(dateStr)}
                      className="hidden text-muted-foreground hover:text-foreground group-hover:block"
                      title="Add on this day"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {dayRows.map((row) => (
                      <button
                        key={row.id}
                        onClick={() => onOpenRow(row.id)}
                        className="block w-full truncate rounded bg-accent px-1 py-0.5 text-left text-xs hover:bg-foreground/10"
                      >
                        {row.title || "Untitled"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
