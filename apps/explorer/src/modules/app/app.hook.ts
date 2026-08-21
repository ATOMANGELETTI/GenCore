import type { ThemeName } from "@gencore/ui-kit";
import * as React from "react";
import { getWindowTheme, subscribeWindowTheme } from "../ipc/ipc.window";

function mapOsTheme(value: "light" | "dark" | null): ThemeName {
  return value === "light" ? "snow-storm" : "polar-night";
}

export function useOsTheme(): ThemeName {
  const [theme, setTheme] = React.useState<ThemeName>("polar-night");

  React.useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        const osTheme = await getWindowTheme();
        if (!cancelled) {
          setTheme(mapOsTheme(osTheme));
        }
      } catch {
        if (!cancelled) {
          setTheme("polar-night");
        }
      }

      if (cancelled) {
        return;
      }

      try {
        const stop = await subscribeWindowTheme((osTheme) => {
          setTheme(mapOsTheme(osTheme));
        });
        if (cancelled) {
          stop();
          return;
        }
        unlisten = stop;
      } catch {
        // Stay on the last mapped theme when live updates are unavailable.
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return theme;
}
