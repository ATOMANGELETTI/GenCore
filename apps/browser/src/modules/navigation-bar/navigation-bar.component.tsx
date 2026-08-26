import { Button, Separator, Tooltip, TooltipContent, TooltipTrigger } from "@gencore/ui-kit";
import { ArrowLeft, ArrowRight, Home, RotateCw, X } from "lucide-react";
import type * as React from "react";
import type { BrowserTab } from "../tabs/tabs.types";
import { AddressBar } from "./navigation-bar.address-bar";

interface NavigationBarProps {
  readonly tab: BrowserTab | null;
  readonly isBookmarked: boolean;
  readonly homepageUrl: string;
  /** Raw omnibox input (URL or search query) — resolution happens upstream. */
  onNavigate: (input: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onToggleBookmark: () => void;
}

export function NavigationBar({
  tab,
  isBookmarked,
  homepageUrl,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onStop,
  onToggleBookmark,
}: NavigationBarProps) {
  const canGoBack = (tab?.historyIndex ?? -1) > 0;
  const canGoForward = tab ? tab.historyIndex < tab.history.length - 1 : false;

  return (
    <div
      data-slot="navigation-bar"
      className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-background px-1.5"
    >
      <IconButton label="Back" disabled={!canGoBack} onClick={onBack}>
        <ArrowLeft />
      </IconButton>
      <IconButton label="Forward" disabled={!canGoForward} onClick={onForward}>
        <ArrowRight />
      </IconButton>
      {tab?.loading ? (
        <IconButton label="Stop" onClick={onStop}>
          <X />
        </IconButton>
      ) : (
        <IconButton label="Reload" disabled={!tab?.hasWebview} onClick={onReload}>
          <RotateCw />
        </IconButton>
      )}
      <IconButton label="Home" onClick={() => onNavigate(homepageUrl)}>
        <Home />
      </IconButton>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <AddressBar
        tab={tab}
        isBookmarked={isBookmarked}
        onSubmit={onNavigate}
        onToggleBookmark={onToggleBookmark}
      />
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
