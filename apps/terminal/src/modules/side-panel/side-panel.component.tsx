import {
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gencore/ui-kit";
import { Bot, Folder, type LucideIcon, Settings } from "lucide-react";
import * as React from "react";
import type { SidePanelTabId } from "./side-panel.types";

const TABS: readonly {
  id: SidePanelTabId;
  label: string;
  Icon: LucideIcon;
  placeholder: string;
}[] = [
  { id: "files", label: "Files", Icon: Folder, placeholder: "Tab 1" },
  { id: "assistant", label: "Assistant", Icon: Bot, placeholder: "Tab 2" },
  { id: "settings", label: "Settings", Icon: Settings, placeholder: "Tab 3" },
];

function panelId(id: SidePanelTabId): string {
  return `side-panel-${id}`;
}

export function SidePanel() {
  const [selected, setSelected] = React.useState<SidePanelTabId>("files");
  const tabRefs = React.useRef<Partial<Record<SidePanelTabId, HTMLButtonElement | null>>>({});

  function selectTab(id: SidePanelTabId) {
    setSelected(id);
    tabRefs.current[id]?.focus();
  }

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, id: SidePanelTabId) {
    const currentIndex = TABS.findIndex((tab) => tab.id === id);
    if (currentIndex < 0) {
      return;
    }

    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = TABS.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const next = TABS[nextIndex];
    if (next) {
      selectTab(next.id);
    }
  }

  return (
    <aside
      data-slot="side-panel"
      className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card"
    >
      <div className="min-h-0 flex-1 overflow-auto">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            id={panelId(tab.id)}
            role="tabpanel"
            hidden={selected !== tab.id}
            aria-labelledby={`side-panel-tab-${tab.id}`}
            className="h-full"
          >
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">{tab.placeholder}</p>
            </div>
          </div>
        ))}
      </div>
      <TooltipProvider>
        <div
          role="tablist"
          aria-label="Side panel"
          className="flex h-8 shrink-0 border-t border-border"
        >
          {TABS.map((tab) => {
            const isSelected = selected === tab.id;
            const { Icon } = tab;

            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <Button
                    ref={(node) => {
                      tabRefs.current[tab.id] = node;
                    }}
                    id={`side-panel-tab-${tab.id}`}
                    role="tab"
                    variant="ghost"
                    size="icon"
                    aria-label={tab.label}
                    aria-selected={isSelected}
                    aria-controls={panelId(tab.id)}
                    tabIndex={isSelected ? 0 : -1}
                    className={cn(
                      "relative h-full w-auto flex-1 rounded-none",
                      isSelected
                        ? "bg-accent text-primary hover:bg-accent hover:text-primary before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                    onClick={() => {
                      selectTab(tab.id);
                    }}
                    onKeyDown={(event) => {
                      onTabKeyDown(event, tab.id);
                    }}
                  >
                    <Icon aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tab.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </aside>
  );
}
