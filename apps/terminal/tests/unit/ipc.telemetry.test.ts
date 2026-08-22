import { describe, expect, it, vi } from "vitest";
import { getSystemTelemetry } from "../../src/modules/ipc/ipc.telemetry";
import type { SystemTelemetry } from "../../src/modules/telemetry/telemetry.types";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
}));

describe("getSystemTelemetry", () => {
  it("invokes plugin:gencore-core|get_system_telemetry", async () => {
    const mockTelemetry: SystemTelemetry = {
      cpu: {
        brand: "AMD",
        overallUsage: 14.5,
        coreCount: 2,
        coreUsages: [12, 17],
        frequencyMhz: 4200,
      },
      gpus: [
        {
          id: "gpu-0",
          name: "AMD Radeon Graphics",
          kind: "integrated",
          utilization: 4.2,
          memoryUsedBytes: 512,
          memoryTotalBytes: 2048,
        },
      ],
      network: {
        activeInterface: "Wi-Fi",
        rxBytesPerSec: 1024,
        txBytesPerSec: 256,
        totalRxBytes: 10,
        totalTxBytes: 4,
      },
      memory: { usedBytes: 8, totalBytes: 32, usagePercent: 25 },
    };
    invoke.mockResolvedValueOnce(mockTelemetry);

    await expect(getSystemTelemetry()).resolves.toEqual(mockTelemetry);
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-core|get_system_telemetry");
  });
});
