import { TooltipProvider } from "@gencore/ui-kit";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CpuWidget } from "../../src/modules/telemetry/cpu-widget.component";
import { GpuWidget } from "../../src/modules/telemetry/gpu-widget.component";
import { NetworkWidget } from "../../src/modules/telemetry/network-widget.component";
import type { SystemTelemetry } from "../../src/modules/telemetry/telemetry.types";
import { TelemetryBar } from "../../src/modules/telemetry/telemetry-bar.component";

const mockTelemetry: SystemTelemetry = {
  cpu: {
    brand: "AMD Ryzen 9",
    overallUsage: 18,
    coreCount: 4,
    coreUsages: [10, 20, 30, 40],
    frequencyMhz: 4200,
  },
  gpus: [
    {
      id: "gpu-0",
      name: "AMD Radeon Graphics",
      kind: "integrated",
      utilization: 4,
      memoryUsedBytes: 1,
      memoryTotalBytes: 4,
    },
    {
      id: "gpu-1",
      name: "RTX 4070",
      kind: "dedicated",
      utilization: 72,
      memoryUsedBytes: 7,
      memoryTotalBytes: 12,
    },
  ],
  network: {
    activeInterface: "Wi-Fi",
    rxBytesPerSec: 1024 * 1024 * 1.4,
    txBytesPerSec: 1024 * 240,
    totalRxBytes: 2 * 1024 * 1024 * 1024,
    totalTxBytes: 84 * 1024 * 1024,
  },
  memory: {
    usedBytes: 18.2 * 1024 * 1024 * 1024,
    totalBytes: 64 * 1024 * 1024 * 1024,
    usagePercent: 28,
  },
};

describe("Telemetry widgets", () => {
  it("renders CPU meter and percent", () => {
    render(
      <TooltipProvider delayDuration={0}>
        <CpuWidget cpu={mockTelemetry.cpu} memory={mockTelemetry.memory} />
      </TooltipProvider>,
    );
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("18%")).toBeInTheDocument();
  });

  it("renders iGPU and dGPU labels and omits missing kinds", () => {
    render(
      <TooltipProvider delayDuration={0}>
        <GpuWidget gpus={mockTelemetry.gpus} />
      </TooltipProvider>,
    );
    expect(screen.getByText("iGPU")).toBeInTheDocument();
    expect(screen.getByText("dGPU")).toBeInTheDocument();
    expect(screen.getByText("4%")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
  });

  it("renders network rates", () => {
    render(
      <TooltipProvider delayDuration={0}>
        <NetworkWidget network={mockTelemetry.network} />
      </TooltipProvider>,
    );
    expect(screen.getByText(/1.4 MB\/s/)).toBeInTheDocument();
    expect(screen.getByText(/240 KB\/s/)).toBeInTheDocument();
  });

  it("hides the bar when telemetry is null", () => {
    const { container } = render(<TelemetryBar telemetry={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows rich CPU tooltip copy on hover", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <CpuWidget cpu={mockTelemetry.cpu} memory={mockTelemetry.memory} />
      </TooltipProvider>,
    );
    await user.hover(screen.getByText("CPU"));
    expect(await screen.findByText("AMD Ryzen 9")).toBeInTheDocument();
    expect(screen.getByText(/4 cores/)).toBeInTheDocument();
    expect(screen.getByText(/Memory/)).toBeInTheDocument();
  });
});
