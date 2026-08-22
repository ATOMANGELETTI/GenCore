import { Tooltip, TooltipContent, TooltipTrigger } from "@gencore/ui-kit";
import { formatMemoryBytes, formatPercent } from "./telemetry.format";
import type { GpuTelemetry } from "./telemetry.types";
import { TelemetryMeter } from "./telemetry-meter.component";

const CHIP_CLASS = "inline-flex cursor-default select-none items-center gap-1 text-xs tabular-nums";

export function GpuWidget({ gpus }: { gpus: readonly GpuTelemetry[] }) {
  if (gpus.length === 0) {
    return null;
  }

  return (
    <>
      {gpus.map((gpu) => {
        const label = gpu.kind === "integrated" ? "iGPU" : "dGPU";
        const kindBadge = gpu.kind === "integrated" ? "Integrated" : "Dedicated";

        return (
          <Tooltip key={gpu.id}>
            <TooltipTrigger asChild>
              <span className={CHIP_CLASS}>
                <span>{label}</span>
                <TelemetryMeter value={gpu.utilization} />
                <span>{formatPercent(gpu.utilization)}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" size="rich">
              <div className="flex flex-col gap-2">
                <p className="truncate text-foreground">{gpu.name}</p>
                <span className="inline-flex w-fit border border-border px-1 text-primary">
                  {kindBadge}
                </span>
                <div className="flex justify-between gap-3">
                  <span>Utilization</span>
                  <span>{formatPercent(gpu.utilization)}</span>
                </div>
                {gpu.memoryTotalBytes > 0 ? (
                  <div className="flex justify-between gap-3">
                    <span>VRAM</span>
                    <span>
                      {formatMemoryBytes(gpu.memoryUsedBytes)} /{" "}
                      {formatMemoryBytes(gpu.memoryTotalBytes)}
                    </span>
                  </div>
                ) : null}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
