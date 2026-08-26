import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@gencore/ui-kit";
import { Plus } from "lucide-react";
import { Tab } from "./tab.component";
import type { BrowserTab } from "./tabs.types";

interface TabStripProps {
  readonly tabs: readonly BrowserTab[];
  readonly activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNewTab: () => void;
}

export function TabStrip({ tabs, activeTabId, onSelect, onClose, onNewTab }: TabStripProps) {
  return (
    <div
      data-slot="tab-strip"
      data-tauri-drag-region
      role="tablist"
      aria-label="Browser tabs"
      className="flex h-9 shrink-0 items-end gap-0.5 border-b border-border bg-muted/40 px-1.5 pt-1.5"
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          tab={tab}
          active={tab.id === activeTabId}
          onSelect={() => onSelect(tab.id)}
          onClose={() => onClose(tab.id)}
        />
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="New tab"
            onClick={onNewTab}
            className="mb-0.5 shrink-0"
          >
            <Plus className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>New tab</TooltipContent>
      </Tooltip>
      <div data-tauri-drag-region className="min-w-4 flex-1 self-stretch" />
    </div>
  );
}
