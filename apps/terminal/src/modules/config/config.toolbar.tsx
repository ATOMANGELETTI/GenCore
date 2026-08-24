import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gencore/ui-kit";
import {
  Bot,
  Check,
  ChevronDown,
  type LucideIcon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Terminal,
} from "lucide-react";
import * as React from "react";
import type { ConfigSubviewId } from "./config.types";

export interface ConfigCategoryItem {
  id: ConfigSubviewId;
  label: string;
  Icon: LucideIcon;
}

export const CONFIG_CATEGORIES: readonly ConfigCategoryItem[] = [
  { id: "appearance", label: "Appearance", Icon: Palette },
  { id: "effects", label: "Background Effects", Icon: Sparkles },
  { id: "prompt", label: "Shell Prompt", Icon: Terminal },
  { id: "assistant", label: "AI Assistant", Icon: Bot },
];

export interface ConfigToolbarProps {
  activeSubview: ConfigSubviewId;
  onSelectSubview: (id: ConfigSubviewId) => void;
  onResetActive?: () => void;
}

export function ConfigToolbar({
  activeSubview,
  onSelectSubview,
  onResetActive,
}: ConfigToolbarProps) {
  const tabRefs = React.useRef<Partial<Record<ConfigSubviewId, HTMLButtonElement | null>>>({});

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, currentId: ConfigSubviewId) {
    const currentIndex = CONFIG_CATEGORIES.findIndex((cat) => cat.id === currentId);
    if (currentIndex < 0) {
      return;
    }

    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % CONFIG_CATEGORIES.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + CONFIG_CATEGORIES.length) % CONFIG_CATEGORIES.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = CONFIG_CATEGORIES.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      const nextCategory = CONFIG_CATEGORIES[nextIndex];
      if (nextCategory) {
        onSelectSubview(nextCategory.id);
        tabRefs.current[nextCategory.id]?.focus();
      }
    }
  }

  return (
    <div
      data-slot="config-toolbar"
      className="flex h-9 shrink-0 select-none items-center justify-between border-b border-border/60 bg-card px-2"
    >
      <TooltipProvider>
        <div
          role="tablist"
          aria-label="Configuration categories"
          className="flex items-center gap-1"
        >
          {CONFIG_CATEGORIES.map((category) => {
            const isSelected = activeSubview === category.id;
            const { Icon } = category;

            return (
              <Tooltip key={category.id}>
                <TooltipTrigger asChild>
                  <Button
                    ref={(node) => {
                      tabRefs.current[category.id] = node;
                    }}
                    type="button"
                    role="tab"
                    variant="ghost"
                    size="icon"
                    aria-label={category.label}
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    className={cn(
                      "size-7 rounded-md p-0 transition-colors",
                      isSelected
                        ? "bg-accent/80 text-accent-foreground ring-1 ring-primary/30"
                        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                    )}
                    onClick={() => {
                      onSelectSubview(category.id);
                    }}
                    onKeyDown={(event) => {
                      onKeyDown(event, category.id);
                    }}
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{category.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="More categories"
            className="size-7 rounded-md p-0 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          >
            <ChevronDown aria-hidden="true" className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            className="flex items-center justify-between"
            onClick={() => onSelectSubview("all")}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              <span>All Settings</span>
            </span>
            {activeSubview === "all" ? (
              <Check className="size-3.5 text-primary" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {CONFIG_CATEGORIES.map((cat) => {
            const isCatActive = activeSubview === cat.id;
            const CatIcon = cat.Icon;

            return (
              <DropdownMenuItem
                key={cat.id}
                className="flex items-center justify-between"
                onClick={() => onSelectSubview(cat.id)}
              >
                <span className="flex items-center gap-2">
                  <CatIcon className="size-3.5" aria-hidden="true" />
                  <span>{cat.label}</span>
                </span>
                {isCatActive ? (
                  <Check className="size-3.5 text-primary" aria-hidden="true" />
                ) : null}
              </DropdownMenuItem>
            );
          })}

          {onResetActive ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="flex items-center gap-2"
                onClick={onResetActive}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span>Reset Section</span>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
