import { describe, expect, it } from "vitest";
import {
  formatBytesPerSec,
  formatFrequency,
  formatMemoryBytes,
  formatPercent,
  loadTone,
} from "../../src/modules/telemetry/telemetry.format";

describe("telemetry formatters", () => {
  it("formats percentages", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(14.2)).toBe("14%");
    expect(formatPercent(99.9)).toBe("100%");
  });

  it("formats throughput", () => {
    expect(formatBytesPerSec(500)).toBe("500 B/s");
    expect(formatBytesPerSec(1024 * 50)).toBe("50 KB/s");
    expect(formatBytesPerSec(1024 * 1024 * 2.5)).toBe("2.5 MB/s");
  });

  it("formats frequency and memory", () => {
    expect(formatFrequency(3800)).toBe("3.8 GHz");
    expect(formatFrequency(800)).toBe("800 MHz");
    expect(formatMemoryBytes(8 * 1024 * 1024 * 1024)).toBe("8.0 GB");
  });

  it("maps load tones", () => {
    expect(loadTone(0)).toBe("normal");
    expect(loadTone(69.9)).toBe("normal");
    expect(loadTone(70)).toBe("warning");
    expect(loadTone(84.9)).toBe("warning");
    expect(loadTone(85)).toBe("critical");
  });
});
