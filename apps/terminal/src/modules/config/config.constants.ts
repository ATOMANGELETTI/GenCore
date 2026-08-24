import type { LucideIcon } from "lucide-react";
import {
  Ban,
  CircleDot,
  Code2,
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
import type {
  BackgroundEffectType,
  DiffEditorPreference,
  EffectInteractionMode,
  PoshThemeId,
  ThemePreference,
} from "./config.types";

export const THEME_OPTIONS: readonly {
  id: ThemePreference;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}[] = [
  { id: "polar-night", title: "Polar Night", subtitle: "Dark Nord palette", Icon: Moon },
  { id: "snow-storm", title: "Snow Storm", subtitle: "Light Nord palette", Icon: Sun },
  { id: "system", title: "Match system", subtitle: "Follow Windows light or dark", Icon: Monitor },
];

export const DIFF_EDITOR_OPTIONS: readonly {
  id: DiffEditorPreference;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}[] = [
  {
    id: "monaco",
    title: "Monaco Diff",
    subtitle: "Rich side-by-side & unified diff viewer",
    Icon: Code2,
  },
  {
    id: "micro",
    title: "Micro Editor",
    subtitle: "Fast terminal TUI with git diff gutter",
    Icon: Terminal,
  },
];

export const BACKGROUND_EFFECT_OPTIONS: readonly {
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

export const INTERACTION_OPTIONS: readonly {
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

export const POSH_THEME_OPTIONS: readonly {
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

export const AGENT_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-pro-preview",
] as const;

export const MIN_CONTEXT_LINES = 20;
export const MAX_CONTEXT_LINES = 200;

export const SECTION_LABEL_CLASS =
  "mb-1.5 mt-3 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0";

export function nextRadioIndex(
  key: string,
  currentIndex: number,
  length: number,
): number | undefined {
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

export function parseContextLines(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_CONTEXT_LINES || parsed > MAX_CONTEXT_LINES) {
    return undefined;
  }
  return parsed;
}
