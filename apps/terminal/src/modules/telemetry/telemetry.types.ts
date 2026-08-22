export type GpuKind = "integrated" | "dedicated";

export interface CpuTelemetry {
  readonly brand: string;
  readonly overallUsage: number;
  readonly coreCount: number;
  readonly coreUsages: readonly number[];
  readonly frequencyMhz: number;
}

export interface GpuTelemetry {
  readonly id: string;
  readonly name: string;
  readonly kind: GpuKind;
  readonly utilization: number;
  readonly memoryUsedBytes: number;
  readonly memoryTotalBytes: number;
}

export interface NetworkTelemetry {
  readonly activeInterface?: string;
  readonly rxBytesPerSec: number;
  readonly txBytesPerSec: number;
  readonly totalRxBytes: number;
  readonly totalTxBytes: number;
}

export interface MemoryTelemetry {
  readonly usedBytes: number;
  readonly totalBytes: number;
  readonly usagePercent: number;
}

export interface SystemTelemetry {
  readonly cpu: CpuTelemetry;
  readonly gpus: readonly GpuTelemetry[];
  readonly network: NetworkTelemetry;
  readonly memory: MemoryTelemetry;
}
