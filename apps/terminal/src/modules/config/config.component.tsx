import { Button, cn, Input, Separator } from "@gencore/ui-kit";
import {
  Ban,
  Check,
  CircleDot,
  type LucideIcon,
  Monitor,
  Moon,
  MousePointer,
  Orbit,
  Share2,
  Sparkles,
  Sun,
  Terminal,
  Waves,
} from "lucide-react";
import * as React from "react";
import { useAgentSettings } from "./config.agent";
import { useConfig } from "./config.hook";
import type {
  BackgroundEffectType,
  EffectInteractionMode,
  PoshThemeId,
  ThemePreference,
} from "./config.types";

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

const BACKGROUND_EFFECT_OPTIONS: readonly {
  id: BackgroundEffectType;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}[] = [
  { id: "none", title: "Off", subtitle: "Solid Nord background", Icon: Ban },
  {
    id: "particles",
    title: "Particles",
    subtitle: "Antigravity stardust & micro-nodes",
    Icon: Sparkles,
  },
  { id: "molecules", title: "Molecules", subtitle: "Synaptic bonds & network graph", Icon: Share2 },
  { id: "orbs", title: "Orbs", subtitle: "Diffused glowing ambient spheres", Icon: Orbit },
];

const INTERACTION_OPTIONS: readonly {
  id: EffectInteractionMode;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}[] = [
  {
    id: "ambient",
    title: "Ambient only",
    subtitle: "No mouse reaction, steady drift",
    Icon: Waves,
  },
  {
    id: "repel",
    title: "Cursor Repulsion",
    subtitle: "Particles part smoothly on proximity",
    Icon: MousePointer,
  },
  {
    id: "ripple",
    title: "Click Ripples & Repel",
    subtitle: "Expanding pulse waves on click",
    Icon: CircleDot,
  },
];

const POSH_THEME_OPTIONS: readonly {
  id: PoshThemeId;
  title: string;
  subtitle: string;
  previewPrompt: string;
}[] = [
  {
    id: "gencore",
    title: "GenCore",
    subtitle: "Adaptive Nord 2-line Powerline prompt",
    previewPrompt: "󰮯 GenCore ❯",
  },
  {
    id: "bubbles",
    title: "Bubbles",
    subtitle: "Rounded bubble badges with git status",
    previewPrompt: " 󰄛   ~/src ",
  },
  {
    id: "iterm2",
    title: "iTerm2",
    subtitle: "Classic macOS terminal Powerline chevron",
    previewPrompt: "user@host  ~ ",
  },
  {
    id: "wholespace",
    title: "Wholespace",
    subtitle: "Clean single-line powerline with path segments",
    previewPrompt: " ~/src  main ❯",
  },
  {
    id: "wopian",
    title: "Wopian",
    subtitle: "Minimalist path and duration prompt",
    previewPrompt: "❯ main ❯",
  },
  {
    id: "clean-detailed",
    title: "Clean Detailed",
    subtitle: "Two-line prompt with execution time and git metadata",
    previewPrompt: "┌─[user]─[~]\n└─❯",
  },
  {
    id: "kali",
    title: "Kali",
    subtitle: "Distinctive Kali Linux security style prompt",
    previewPrompt: "┌──(user㉿gencore)-[~]\n└─$ ",
  },
];

const AGENT_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-pro-preview",
] as const;

const MIN_CONTEXT_LINES = 20;
const MAX_CONTEXT_LINES = 200;

const SECTION_LABEL_CLASS =
  "mb-1.5 mt-3 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0";

function nextRadioIndex(key: string, currentIndex: number, length: number): number | undefined {
  if (key === "ArrowRight" || key === "ArrowDown") {
    return (currentIndex + 1) % length;
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return (currentIndex - 1 + length) % length;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return length - 1;
  }
  return undefined;
}

function parseContextLines(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_CONTEXT_LINES || parsed > MAX_CONTEXT_LINES) {
    return undefined;
  }
  return parsed;
}

export function Config() {
  const {
    preference,
    setPreference,
    poshTheme,
    setPoshTheme,
    backgroundEffect,
    setBackgroundEffect,
    effectInteraction,
    setEffectInteraction,
    effectOpacity,
    setEffectOpacity,
    effectSpeed,
    setEffectSpeed,
  } = useConfig();

  const agent = useAgentSettings();
  const radioRefs = React.useRef<Partial<Record<ThemePreference, HTMLButtonElement | null>>>({});
  const effectRadioRefs = React.useRef<
    Partial<Record<BackgroundEffectType, HTMLButtonElement | null>>
  >({});
  const interactionRadioRefs = React.useRef<
    Partial<Record<EffectInteractionMode, HTMLButtonElement | null>>
  >({});
  const poshRadioRefs = React.useRef<Partial<Record<PoshThemeId, HTMLButtonElement | null>>>({});
  const modelRadioRefs = React.useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const [keyDraft, setKeyDraft] = React.useState("");
  const [replacing, setReplacing] = React.useState(false);
  const [contextDraft, setContextDraft] = React.useState(() => String(agent.contextLines));

  React.useEffect(() => {
    setContextDraft(String(agent.contextLines));
  }, [agent.contextLines]);

  function focusPreference(id: ThemePreference) {
    radioRefs.current[id]?.focus();
  }

  function focusEffect(id: BackgroundEffectType) {
    effectRadioRefs.current[id]?.focus();
  }

  function focusInteraction(id: EffectInteractionMode) {
    interactionRadioRefs.current[id]?.focus();
  }

  function focusPoshTheme(id: PoshThemeId) {
    poshRadioRefs.current[id]?.focus();
  }

  function onRadioKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, id: ThemePreference) {
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
      setPreference(next.id);
      focusPreference(next.id);
    }
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

  function onModelKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, model: string) {
    const currentIndex = AGENT_MODELS.indexOf(model as (typeof AGENT_MODELS)[number]);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = nextRadioIndex(event.key, currentIndex, AGENT_MODELS.length);
    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const next = AGENT_MODELS[nextIndex];
    if (next) {
      agent.setModel(next);
      modelRadioRefs.current[next]?.focus();
    }
  }

  async function handleSaveKey() {
    const trimmed = keyDraft.trim();
    if (!trimmed) {
      return;
    }
    const saved = await agent.saveKey(trimmed);
    if (saved) {
      setKeyDraft("");
      setReplacing(false);
    }
  }

  function handleReplaceKey() {
    agent.replaceKey();
    setReplacing(true);
  }

  function handleCancelReplace() {
    setReplacing(false);
    setKeyDraft("");
  }

  function handleContextChange(value: string) {
    setContextDraft(value);
    const parsed = parseContextLines(value);
    if (parsed === undefined) {
      return;
    }
    agent.setContextLines(parsed);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-7 select-none items-center border-b border-border px-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          CONFIG
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <p className={SECTION_LABEL_CLASS}>Appearance</p>
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

        <p className={SECTION_LABEL_CLASS}>Assistant</p>
        <div className="overflow-hidden rounded-sm border border-border bg-background">
          {agent.hasApiKey && !replacing ? (
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <div className="min-w-0">
                <p className="text-xs text-primary">Gemini API key</p>
                <p className="text-[10px] text-muted-foreground">Key saved · Windows DPAPI</p>
              </div>
              <div className="flex shrink-0 items-center">
                <Button variant="ghost" size="sm" onClick={handleReplaceKey}>
                  Replace
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    void agent.clearKey();
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <Input
                type="password"
                autoComplete="off"
                spellCheck={false}
                aria-label="Gemini API key"
                placeholder="Gemini API key"
                value={keyDraft}
                className="h-5 min-w-0 flex-1"
                onChange={(event) => {
                  setKeyDraft(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSaveKey();
                  }
                }}
              />
              <Button
                size="sm"
                disabled={!keyDraft.trim()}
                onClick={() => {
                  void handleSaveKey();
                }}
              >
                Save
              </Button>
              {replacing ? (
                <Button variant="ghost" size="sm" onClick={handleCancelReplace}>
                  Cancel
                </Button>
              ) : null}
            </div>
          )}
          <Separator />
          <div role="radiogroup" aria-label="Model">
            {AGENT_MODELS.map((model, index) => {
              const isSelected = agent.model === model;

              return (
                <React.Fragment key={model}>
                  {index > 0 ? <Separator /> : null}
                  <Button
                    ref={(node) => {
                      modelRadioRefs.current[model] = node;
                    }}
                    type="button"
                    role="radio"
                    variant="ghost"
                    aria-checked={isSelected}
                    aria-label={model}
                    tabIndex={isSelected ? 0 : -1}
                    className={cn(
                      "h-auto w-full justify-between rounded-none px-2 py-1.5",
                      isSelected
                        ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                    onClick={() => {
                      agent.setModel(model);
                    }}
                    onKeyDown={(event) => {
                      onModelKeyDown(event, model);
                    }}
                  >
                    <span className="text-xs font-medium">{model}</span>
                    {isSelected ? <Check aria-hidden="true" className="size-3 shrink-0" /> : null}
                  </Button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <p className={SECTION_LABEL_CLASS}>Context</p>
        <div className="overflow-hidden rounded-sm border border-border bg-background">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="min-w-0">
              <p className="text-xs">Terminal lines</p>
              <p className="text-[10px] text-muted-foreground">
                {`Last ${agent.contextLines} lines with each send`}
              </p>
            </div>
            <Input
              type="number"
              inputMode="numeric"
              aria-label="Terminal lines"
              min={MIN_CONTEXT_LINES}
              max={MAX_CONTEXT_LINES}
              value={contextDraft}
              className="h-5 w-14 shrink-0 text-right"
              onChange={(event) => {
                handleContextChange(event.target.value);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
