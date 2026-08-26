import { History as HistoryIcon } from "lucide-react";
import * as React from "react";
import { hostnameOf } from "../navigation-bar/navigation-bar.omnibox";
import type { HistoryEntry } from "./history.types";

interface HistoryPanelProps {
  readonly entries: readonly HistoryEntry[];
  onOpen: (url: string) => void;
}

function dayLabel(ms: number): string {
  const date = new Date(ms);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function HistoryPanel({ entries, onOpen }: HistoryPanelProps) {
  const groups = React.useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.visitedAtMs - a.visitedAtMs);
    const byDay = new Map<string, HistoryEntry[]>();
    for (const entry of sorted) {
      const key = dayLabel(entry.visitedAtMs);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        byDay.set(key, [entry]);
      }
    }
    return [...byDay.entries()];
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
        <HistoryIcon className="size-5 opacity-50" />
        <p>Pages you visit appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-1.5">
      {groups.map(([label, dayEntries]) => (
        <section key={label}>
          <h3 className="px-2 py-1 text-[11px] font-medium text-muted-foreground">{label}</h3>
          <ul className="flex flex-col gap-0.5">
            {dayEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onOpen(entry.url)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-accent"
                >
                  <span className="min-w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {new Date(entry.visitedAtMs).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                    {hostnameOf(entry.url)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
