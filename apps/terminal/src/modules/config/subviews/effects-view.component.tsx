import { Button, cn, Separator } from "@gencore/ui-kit";
import { Check } from "lucide-react";
import * as React from "react";
import {
  BACKGROUND_EFFECT_OPTIONS,
  INTERACTION_OPTIONS,
  nextRadioIndex,
  SECTION_LABEL_CLASS,
} from "../config.constants";
import { useConfig } from "../config.hook";
import type { BackgroundEffectType, EffectInteractionMode } from "../config.types";

export function EffectsView() {
  const {
    backgroundEffect,
    setBackgroundEffect,
    effectInteraction,
    setEffectInteraction,
    effectOpacity,
    setEffectOpacity,
    effectSpeed,
    setEffectSpeed,
  } = useConfig();

  const effectRadioRefs = React.useRef<
    Partial<Record<BackgroundEffectType, HTMLButtonElement | null>>
  >({});
  const interactionRadioRefs = React.useRef<
    Partial<Record<EffectInteractionMode, HTMLButtonElement | null>>
  >({});

  function focusEffect(id: BackgroundEffectType) {
    effectRadioRefs.current[id]?.focus();
  }

  function focusInteraction(id: EffectInteractionMode) {
    interactionRadioRefs.current[id]?.focus();
  }

  function onEffectKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    id: BackgroundEffectType,
  ) {
    const currentIndex = BACKGROUND_EFFECT_OPTIONS.findIndex((option) => option.id === id);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = nextRadioIndex(event.key, currentIndex, BACKGROUND_EFFECT_OPTIONS.length);
    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const next = BACKGROUND_EFFECT_OPTIONS[nextIndex];
    if (next) {
      setBackgroundEffect(next.id);
      focusEffect(next.id);
    }
  }

  function onInteractionKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    id: EffectInteractionMode,
  ) {
    const currentIndex = INTERACTION_OPTIONS.findIndex((option) => option.id === id);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = nextRadioIndex(event.key, currentIndex, INTERACTION_OPTIONS.length);
    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const next = INTERACTION_OPTIONS[nextIndex];
    if (next) {
      setEffectInteraction(next.id);
      focusInteraction(next.id);
    }
  }

  return (
    <div data-slot="effects-view">
      <p className={SECTION_LABEL_CLASS}>Background Effect</p>
      <div
        role="radiogroup"
        aria-label="Background Effect"
        className="overflow-hidden rounded-sm border border-border bg-background"
      >
        {BACKGROUND_EFFECT_OPTIONS.map((option, index) => {
          const isSelected = backgroundEffect === option.id;
          const { Icon } = option;

          return (
            <React.Fragment key={option.id}>
              {index > 0 ? <Separator /> : null}
              <Button
                ref={(node) => {
                  effectRadioRefs.current[option.id] = node;
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
                  setBackgroundEffect(option.id);
                }}
                onKeyDown={(event) => {
                  onEffectKeyDown(event, option.id);
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

      {backgroundEffect !== "none" ? (
        <>
          <p className={SECTION_LABEL_CLASS}>Mouse Interaction</p>
          <div
            role="radiogroup"
            aria-label="Mouse Interaction"
            className="overflow-hidden rounded-sm border border-border bg-background"
          >
            {INTERACTION_OPTIONS.map((option, index) => {
              const isSelected = effectInteraction === option.id;
              const { Icon } = option;

              return (
                <React.Fragment key={option.id}>
                  {index > 0 ? <Separator /> : null}
                  <Button
                    ref={(node) => {
                      interactionRadioRefs.current[option.id] = node;
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
                      setEffectInteraction(option.id);
                    }}
                    onKeyDown={(event) => {
                      onInteractionKeyDown(event, option.id);
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

          <p className={SECTION_LABEL_CLASS}>Effect Controls</p>
          <div className="space-y-2 overflow-hidden rounded-sm border border-border bg-background p-2">
            <div>
              <div className="flex items-center justify-between text-xs font-medium">
                <label htmlFor="effect-opacity-slider">Opacity</label>
                <span className="text-[10px] text-muted-foreground">{`${Math.round(effectOpacity * 100)}%`}</span>
              </div>
              <input
                id="effect-opacity-slider"
                type="range"
                aria-label="Effect Opacity"
                min="0.1"
                max="1.0"
                step="0.05"
                value={effectOpacity}
                className="mt-1 w-full accent-primary"
                onChange={(event) => {
                  setEffectOpacity(Number(event.target.value));
                }}
              />
              <div className="mt-1 flex items-center justify-between gap-1">
                <Button
                  type="button"
                  variant={effectOpacity === 0.3 ? "default" : "ghost"}
                  size="sm"
                  className="h-5 flex-1 px-1 text-[10px]"
                  onClick={() => setEffectOpacity(0.3)}
                >
                  Subtle
                </Button>
                <Button
                  type="button"
                  variant={effectOpacity === 0.5 ? "default" : "ghost"}
                  size="sm"
                  className="h-5 flex-1 px-1 text-[10px]"
                  onClick={() => setEffectOpacity(0.5)}
                >
                  Balanced
                </Button>
                <Button
                  type="button"
                  variant={effectOpacity === 0.75 ? "default" : "ghost"}
                  size="sm"
                  className="h-5 flex-1 px-1 text-[10px]"
                  onClick={() => setEffectOpacity(0.75)}
                >
                  Vivid
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between text-xs font-medium">
                <label htmlFor="effect-speed-slider">Speed</label>
                <span className="text-[10px] text-muted-foreground">{`${effectSpeed.toFixed(1)}x`}</span>
              </div>
              <input
                id="effect-speed-slider"
                type="range"
                aria-label="Effect Speed"
                min="0.2"
                max="2.0"
                step="0.1"
                value={effectSpeed}
                className="mt-1 w-full accent-primary"
                onChange={(event) => {
                  setEffectSpeed(Number(event.target.value));
                }}
              />
              <div className="mt-1 flex items-center justify-between gap-1">
                <Button
                  type="button"
                  variant={effectSpeed === 0.5 ? "default" : "ghost"}
                  size="sm"
                  className="h-5 flex-1 px-1 text-[10px]"
                  onClick={() => setEffectSpeed(0.5)}
                >
                  0.5x
                </Button>
                <Button
                  type="button"
                  variant={effectSpeed === 1.0 ? "default" : "ghost"}
                  size="sm"
                  className="h-5 flex-1 px-1 text-[10px]"
                  onClick={() => setEffectSpeed(1.0)}
                >
                  1.0x
                </Button>
                <Button
                  type="button"
                  variant={effectSpeed === 1.5 ? "default" : "ghost"}
                  size="sm"
                  className="h-5 flex-1 px-1 text-[10px]"
                  onClick={() => setEffectSpeed(1.5)}
                >
                  1.5x
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
