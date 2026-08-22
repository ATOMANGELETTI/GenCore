import { cn } from "@gencore/ui-kit";
import { loadTone } from "./telemetry.format";

const SEGMENT_COUNT = 4;
const SEGMENT_IDS = ["seg-0", "seg-1", "seg-2", "seg-3"] as const;

function fillCount(value: number): number {
  return Math.min(SEGMENT_COUNT, Math.max(0, Math.floor(value / 25)));
}

function activeToneClass(value: number): string {
  const tone = loadTone(value);
  if (tone === "critical") {
    return "bg-destructive";
  }
  if (tone === "warning") {
    return "bg-warning";
  }
  return "bg-primary";
}

export function TelemetryMeter({ value }: { value: number }) {
  const filled = fillCount(value);
  const activeClass = activeToneClass(value);

  return (
    <span className="inline-flex items-center gap-px" aria-hidden="true">
      {SEGMENT_IDS.map((id, index) => (
        <span key={id} className={cn("h-2 w-1", index < filled ? activeClass : "bg-muted")} />
      ))}
    </span>
  );
}
