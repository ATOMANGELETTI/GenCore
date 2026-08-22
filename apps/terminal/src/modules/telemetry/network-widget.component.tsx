import { Tooltip, TooltipContent, TooltipTrigger } from "@gencore/ui-kit";
import { formatBytesPerSec, formatMemoryBytes } from "./telemetry.format";
import type { NetworkTelemetry } from "./telemetry.types";

const CHIP_CLASS = "inline-flex cursor-default select-none items-center gap-1 text-xs tabular-nums";

export function NetworkWidget({ network }: { network: NetworkTelemetry }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={CHIP_CLASS}>
          <span className="text-primary">↓ {formatBytesPerSec(network.rxBytesPerSec)}</span>
          <span className="text-nord-frost-9 [.theme-snow-storm_&]:text-nord-frost-10">
            ↑ {formatBytesPerSec(network.txBytesPerSec)}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" size="rich">
        <div className="flex flex-col gap-2">
          <p className="truncate text-foreground">
            {network.activeInterface ?? "Network activity"}
          </p>
          <div className="flex justify-between gap-3">
            <span>Download</span>
            <span>{formatBytesPerSec(network.rxBytesPerSec)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Upload</span>
            <span>{formatBytesPerSec(network.txBytesPerSec)}</span>
          </div>
          <p className="text-muted-foreground">
            ↓ {formatMemoryBytes(network.totalRxBytes)} · ↑{" "}
            {formatMemoryBytes(network.totalTxBytes)}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
