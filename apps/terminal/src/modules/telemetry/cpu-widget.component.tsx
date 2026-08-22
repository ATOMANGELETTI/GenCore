import { Tooltip, TooltipContent, TooltipTrigger } from "@gencore/ui-kit";
import { formatFrequency, formatMemoryBytes, formatPercent } from "./telemetry.format";
import type { CpuTelemetry, MemoryTelemetry } from "./telemetry.types";
import { TelemetryMeter } from "./telemetry-meter.component";

const CHIP_CLASS = "inline-flex cursor-default select-none items-center gap-1 text-xs tabular-nums";
const MAX_CORE_METERS = 16;

export function CpuWidget({ cpu, memory }: { cpu: CpuTelemetry; memory: MemoryTelemetry }) {
  const visibleCores = cpu.coreUsages.slice(0, MAX_CORE_METERS).map((usage, coreNumber) => ({
    id: `core-${coreNumber + 1}`,
    usage,
  }));
  const overflow = Math.max(cpu.coreCount, cpu.coreUsages.length) - visibleCores.length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={CHIP_CLASS}>
          <span>CPU</span>
          <TelemetryMeter value={cpu.overallUsage} />
          <span>{formatPercent(cpu.overallUsage)}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" size="rich">
        <div className="flex flex-col gap-2">
          <p className="truncate text-foreground">{cpu.brand}</p>
          <p className="text-muted-foreground">
            {cpu.coreCount} cores · {formatFrequency(cpu.frequencyMhz)}
          </p>
          <div className="flex justify-between gap-3">
            <span>Overall load</span>
            <span>{formatPercent(cpu.overallUsage)}</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {visibleCores.map((core) => (
              <TelemetryMeter key={core.id} value={core.usage} />
            ))}
          </div>
          {overflow > 0 ? <p>+{overflow}</p> : null}
          <div className="flex justify-between gap-3">
            <span>Memory</span>
            <span>
              {formatMemoryBytes(memory.usedBytes)} / {formatMemoryBytes(memory.totalBytes)}
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
