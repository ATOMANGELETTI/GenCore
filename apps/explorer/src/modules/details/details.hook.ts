import * as React from "react";
import { statPath } from "../ipc/ipc.fs";
import type { StatResult } from "../ipc/ipc.types";

export function useDetails(selectedPath: string | null) {
  const [stat, setStat] = React.useState<StatResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!selectedPath) {
      setStat(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    statPath(selectedPath)
      .then((result) => {
        if (!cancelled) {
          setStat(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStat(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  return { stat, loading };
}
