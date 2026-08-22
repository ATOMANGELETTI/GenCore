import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSystemTelemetry } from "../../src/modules/telemetry/telemetry.hook";
import type { SystemTelemetry } from "../../src/modules/telemetry/telemetry.types";

const { getSystemTelemetry } = vi.hoisted(() => ({
  getSystemTelemetry: vi.fn(),
}));

vi.mock("../../src/modules/ipc/ipc.telemetry", () => ({
  getSystemTelemetry,
}));

const mockData: SystemTelemetry = {
  cpu: { brand: "AMD", overallUsage: 25, coreCount: 1, coreUsages: [25], frequencyMhz: 3600 },
  gpus: [
    {
      id: "gpu-0",
      name: "iGPU",
      kind: "integrated",
      utilization: 5,
      memoryUsedBytes: 0,
      memoryTotalBytes: 0,
    },
  ],
  network: { rxBytesPerSec: 2048, txBytesPerSec: 1024, totalRxBytes: 2048, totalTxBytes: 1024 },
  memory: { usedBytes: 4, totalBytes: 16, usagePercent: 25 },
};

function Probe() {
  const { telemetry, isPaused } = useSystemTelemetry({ intervalMs: 100 });
  return (
    <div>
      <span data-testid="cpu">{telemetry ? `${telemetry.cpu.overallUsage}%` : "loading"}</span>
      <span data-testid="paused">{isPaused ? "paused" : "active"}</span>
    </div>
  );
}

describe("useSystemTelemetry", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    getSystemTelemetry.mockResolvedValue(mockData);
  });

  afterEach(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fetches on mount", async () => {
    render(<Probe />);
    expect(screen.getByTestId("cpu")).toHaveTextContent("loading");
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("cpu")).toHaveTextContent("25%");
  });

  it("pauses when document is hidden", async () => {
    render(<Probe />);
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByTestId("paused")).toHaveTextContent("paused");
  });

  it("keeps the last snapshot when a later poll fails", async () => {
    getSystemTelemetry.mockResolvedValueOnce(mockData).mockRejectedValueOnce(new Error("busy"));
    render(<Probe />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("cpu")).toHaveTextContent("25%");
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(screen.getByTestId("cpu")).toHaveTextContent("25%");
  });
});
