import { TooltipProvider } from "@gencore/ui-kit";
import { CpuWidget } from "./cpu-widget.component";
import { GpuWidget } from "./gpu-widget.component";
import { NetworkWidget } from "./network-widget.component";
import type { SystemTelemetry } from "./telemetry.types";

export function TelemetryBar({ telemetry }: { telemetry: SystemTelemetry | null }) {
  if (!telemetry) {
    return null;
  }
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        <CpuWidget cpu={telemetry.cpu} memory={telemetry.memory} />
        <GpuWidget gpus={telemetry.gpus} />
        <NetworkWidget network={telemetry.network} />
      </div>
    </TooltipProvider>
  );
}
