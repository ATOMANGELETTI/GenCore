import { Button, cn, Separator } from "@gencore/ui-kit";
import { Check, Terminal } from "lucide-react";
import * as React from "react";
import { nextRadioIndex, POSH_THEME_OPTIONS, SECTION_LABEL_CLASS } from "../config.constants";
import { useConfig } from "../config.hook";
import type { PoshThemeId } from "../config.types";

export function PromptView() {
  const { poshTheme, setPoshTheme } = useConfig();
  const poshRadioRefs = React.useRef<Partial<Record<PoshThemeId, HTMLButtonElement | null>>>({});

  function focusPoshTheme(id: PoshThemeId) {
    poshRadioRefs.current[id]?.focus();
  }

  function onPoshRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, id: PoshThemeId) {
    const currentIndex = POSH_THEME_OPTIONS.findIndex((option) => option.id === id);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = nextRadioIndex(event.key, currentIndex, POSH_THEME_OPTIONS.length);
    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const next = POSH_THEME_OPTIONS[nextIndex];
    if (next) {
      setPoshTheme(next.id);
      focusPoshTheme(next.id);
    }
  }

  return (
    <div data-slot="prompt-view">
      <p className={SECTION_LABEL_CLASS}>Prompt Theme</p>
      <div
        role="radiogroup"
        aria-label="Prompt Theme"
        className="overflow-hidden rounded-sm border border-border bg-background"
      >
        {POSH_THEME_OPTIONS.map((option, index) => {
          const isSelected = poshTheme === option.id;

          return (
            <React.Fragment key={option.id}>
              {index > 0 ? <Separator /> : null}
              <Button
                ref={(node) => {
                  poshRadioRefs.current[option.id] = node;
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
                  setPoshTheme(option.id);
                }}
                onKeyDown={(event) => {
                  onPoshRadioKeyDown(event, option.id);
                }}
              >
                <Terminal aria-hidden="true" className="size-3 shrink-0" />
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
