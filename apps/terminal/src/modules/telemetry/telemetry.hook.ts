import * as React from "react";
import { getSystemTelemetry } from "../ipc/ipc.telemetry";
import type { SystemTelemetry } from "./telemetry.types";

export interface UseSystemTelemetryOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export function useSystemTelemetry(options: UseSystemTelemetryOptions = {}) {
  const { intervalMs = 1000, enabled = true } = options;
  const [telemetry, setTelemetry] = React.useState<SystemTelemetry | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isPaused, setIsPaused] = React.useState(false);

  const fetchTelemetry = React.useCallback(async () => {
    try {
      const data = await getSystemTelemetry();
      setTelemetry(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    function handleVisibility() {
      const hidden = document.visibilityState === "hidden";
      setIsPaused(hidden);
      if (!hidden) {
        void fetchTelemetry();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    void fetchTelemetry();
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      void fetchTelemetry();
    }, intervalMs);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, intervalMs, fetchTelemetry]);

  return { telemetry, error, isPaused, refresh: fetchTelemetry };
}
