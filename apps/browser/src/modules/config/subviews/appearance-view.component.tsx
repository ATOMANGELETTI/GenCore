import { Button, cn, Separator } from "@gencore/ui-kit";
import { Check } from "lucide-react";
import * as React from "react";
import { nextRadioIndex, SECTION_LABEL_CLASS, THEME_OPTIONS } from "../config.constants";
import { useConfig } from "../config.hook";
import type { ThemePreference } from "../config.types";

export function AppearanceView() {
  const { themePreference, setThemePreference } = useConfig();
  const themeRefs = React.useRef<Partial<Record<ThemePreference, HTMLButtonElement | null>>>({});

  function onThemeRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, id: ThemePreference) {
    const currentIndex = THEME_OPTIONS.findIndex((option) => option.id === id);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = nextRadioIndex(event.key, currentIndex, THEME_OPTIONS.length);
    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const next = THEME_OPTIONS[nextIndex];
    if (next) {
      setThemePreference(next.id);
      themeRefs.current[next.id]?.focus();
    }
  }

  return (
    <div data-slot="appearance-view">
      <p className={SECTION_LABEL_CLASS}>Appearance</p>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="overflow-hidden rounded-sm border border-border bg-background"
      >
        {THEME_OPTIONS.map((option, index) => {
          const isSelected = themePreference === option.id;
          const { Icon } = option;

          return (
            <React.Fragment key={option.id}>
              {index > 0 ? <Separator /> : null}
              <Button
                ref={(node) => {
                  themeRefs.current[option.id] = node;
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
                  setThemePreference(option.id);
                }}
                onKeyDown={(event) => {
                  onThemeRadioKeyDown(event, option.id);
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
  );
}
