import { cn } from "@gencore/ui-kit";
import { Globe, X } from "lucide-react";
import * as React from "react";
import { faviconUrlOf, hostnameOf } from "../navigation-bar/navigation-bar.omnibox";
import type { BrowserTab } from "./tabs.types";

interface TabProps {
  readonly tab: BrowserTab;
  readonly active: boolean;
  onSelect: () => void;
  onClose: () => void;
}

function tabTitle(tab: BrowserTab): string {
  if (!tab.url) {
    return "New Tab";
  }
  return hostnameOf(tab.url);
}

export function Tab({ tab, active, onSelect, onClose }: TabProps) {
  const [faviconFailed, setFaviconFailed] = React.useState(false);
  const faviconUrl = tab.url ? faviconUrlOf(tab.url) : null;

  return (
    <div
      data-slot="browser-tab"
      role="tab"
      aria-selected={active}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onSelect();
        }
      }}
      className={cn(
        "group relative flex h-8 max-w-52 min-w-32 shrink-0 cursor-default items-center gap-1.5 rounded-t-md px-2.5 text-xs select-none",
        active
          ? "bg-background text-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        {faviconUrl && !faviconFailed ? (
          <img
            src={faviconUrl}
            alt=""
            className="size-3.5 rounded-[2px]"
            onError={() => setFaviconFailed(true)}
          />
        ) : tab.loading ? (
          <span className="size-2.5 animate-spin rounded-full border-[1.5px] border-nord-frost-9 border-t-transparent" />
        ) : (
          <Globe className="size-3.5 opacity-70" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{tabTitle(tab)}</span>
      <button
        type="button"
        aria-label="Close tab"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="flex size-4 shrink-0 items-center justify-center rounded-sm opacity-0 hover:bg-accent group-hover:opacity-100 data-[active=true]:opacity-100"
        data-active={active}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
