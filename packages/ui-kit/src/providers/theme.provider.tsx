import * as React from "react";
import { cn } from "../lib/cn";
import type { ThemeContextValue, ThemeName, ThemeProviderProps, ThemeTokens } from "./theme.types";

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const themeClassName: Record<ThemeName, string> = {
  "polar-night": "theme-polar-night dark",
  "snow-storm": "theme-snow-storm light",
};

/** `primaryForeground` → `--primary-foreground`. */
function tokenVarName(token: string): string {
  return `--${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

function toCssVariables(tokens: Partial<ThemeTokens>): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const [token, value] of Object.entries(tokens)) {
    if (value) {
      style[tokenVarName(token)] = value;
    }
  }
  return style as React.CSSProperties;
}

export function ThemeProvider({
  children,
  theme: controlledTheme,
  defaultTheme = "polar-night",
  onThemeChange,
  tokens,
  className,
}: ThemeProviderProps) {
  const [uncontrolledTheme, setUncontrolledTheme] = React.useState<ThemeName>(defaultTheme);
  const theme = controlledTheme ?? uncontrolledTheme;

  const setTheme = React.useCallback(
    (next: ThemeName) => {
      if (controlledTheme === undefined) {
        setUncontrolledTheme(next);
      }
      onThemeChange?.(next);
    },
    [controlledTheme, onThemeChange],
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, tokens: tokens ?? {} }),
    [theme, setTheme, tokens],
  );

  React.useEffect(() => {
    const root = document.documentElement;
    const applied = themeClassName[theme].split(" ");
    const opposite =
      theme === "polar-night" ? themeClassName["snow-storm"] : themeClassName["polar-night"];

    root.classList.remove(...opposite.split(" "));
    root.classList.add(...applied);

    return () => {
      root.classList.remove(...applied);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>
      <div
        data-slot="theme-provider"
        data-theme={theme}
        className={cn("h-full font-sans text-foreground", themeClassName[theme], className)}
        style={tokens ? toCssVariables(tokens) : undefined}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside a <ThemeProvider>");
  }
  return context;
}
