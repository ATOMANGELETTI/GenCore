import { Button, cn, Separator } from "@gencore/ui-kit";
import { Check, type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import * as React from "react";
import { useConfig } from "./config.hook";
import type { ThemePreference } from "./config.types";

const THEME_OPTIONS: readonly {
  id: ThemePreference;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}[] = [
  { id: "polar-night", title: "Polar Night", subtitle: "Dark Nord palette", Icon: Moon },
  { id: "snow-storm", title: "Snow Storm", subtitle: "Light Nord palette", Icon: Sun },
  { id: "system", title: "Match system", subtitle: "Follow Windows light or dark", Icon: Monitor },
];

export function Config() {
  const { preference, setPreference } = useConfig();
  const radioRefs = React.useRef<Partial<Record<ThemePreference, HTMLButtonElement | null>>>({});

  function focusPreference(id: ThemePreference) {
    radioRefs.current[id]?.focus();
  }

  function onRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, id: ThemePreference) {
    const currentIndex = THEME_OPTIONS.findIndex((option) => option.id === id);
    if (currentIndex < 0) {
      return;
    }

    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = THEME_OPTIONS.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const next = THEME_OPTIONS[nextIndex];
    if (next) {
      setPreference(next.id);
      focusPreference(next.id);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-7 select-none items-center border-b border-border px-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          CONFIG
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Appearance
        </p>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="overflow-hidden rounded-sm border border-border bg-background"
        >
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = preference === option.id;
            const { Icon } = option;

            return (
              <React.Fragment key={option.id}>
                {index > 0 ? <Separator /> : null}
                <Button
                  ref={(node) => {
                    radioRefs.current[option.id] = node;
                  }}
                  type="button"
                  role="radio"
                  variant="ghost"
                  aria-checked={isSelected}
                  aria-label={`${option.title}, ${option.subtitle}`}
                  tabIndex={isSelected ? 0 : -1}
                  className={cn(
                    "group h-auto w-full justify-start gap-2 rounded-none px-2 py-1.5",
                    isSelected
                      ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={() => {
                    setPreference(option.id);
                  }}
                  onKeyDown={(event) => {
                    onRadioKeyDown(event, option.id);
                  }}
                >
                  <Icon aria-hidden="true" className="size-3 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                    <span className="text-xs font-medium">{option.title}</span>
                    <span
                      className={cn(
                        "text-[10px]",
                        isSelected
                          ? "text-accent-foreground"
                          : "text-muted-foreground group-hover:text-accent-foreground",
                      )}
                    >
                      {option.subtitle}
                    </span>
                  </span>
                  {isSelected ? <Check aria-hidden="true" className="size-3 shrink-0" /> : null}
                </Button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
