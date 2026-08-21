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
import { Config } from "../config/config.component";
import { FileTree } from "../file-tree/file-tree.component";
import {
  clampSidePanelWidth,
  DEFAULT_SIDE_PANEL_WIDTH,
  MIN_SIDE_PANEL_WIDTH,
  maxSidePanelWidth,
  SIDE_PANEL_WIDTH_STEP,
} from "./side-panel.resize";
import type { SidePanelTabId } from "./side-panel.types";

const TABS: readonly {
  id: SidePanelTabId;
  label: string;
  Icon: LucideIcon;
  placeholder?: string;
}[] = [
  { id: "files", label: "Files", Icon: Folder },
  { id: "assistant", label: "Assistant", Icon: Bot, placeholder: "Tab 2" },
  { id: "config", label: "Config", Icon: Settings },
];

function panelId(id: SidePanelTabId): string {
  return `side-panel-${id}`;
}

export function SidePanel() {
  const [selected, setSelected] = React.useState<SidePanelTabId>("files");
  const [width, setWidth] = React.useState(DEFAULT_SIDE_PANEL_WIDTH);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const rootRef = React.useRef<HTMLElement | null>(null);
  const dragRef = React.useRef<{ startX: number; startWidth: number } | null>(null);
  const tabRefs = React.useRef<Partial<Record<SidePanelTabId, HTMLButtonElement | null>>>({});

  React.useEffect(() => {
    const parent = rootRef.current?.parentElement;

    function syncFromParent() {
      const next = rootRef.current?.parentElement?.clientWidth ?? 0;
      setContainerWidth(next);
      setWidth((current) => clampSidePanelWidth(current, next));
    }

    syncFromParent();

    let observer: ResizeObserver | undefined;
    if (parent && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        const next = parent.clientWidth;
        setContainerWidth(next);
        setWidth((current) => clampSidePanelWidth(current, next));
      });
      observer.observe(parent);
    }

    return () => {
      observer?.disconnect();
    };
  }, []);

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

  function endDrag() {
    dragRef.current = null;
  }

  function onHandlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startWidth: width };
  }

  function onHandlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    setWidth(clampSidePanelWidth(drag.startWidth + (event.clientX - drag.startX), containerWidth));
  }

  function onHandleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let nextWidth: number | undefined;
    if (event.key === "ArrowRight") {
      nextWidth = width + SIDE_PANEL_WIDTH_STEP;
    } else if (event.key === "ArrowLeft") {
      nextWidth = width - SIDE_PANEL_WIDTH_STEP;
    } else if (event.key === "Home") {
      nextWidth = MIN_SIDE_PANEL_WIDTH;
    } else if (event.key === "End") {
      nextWidth = maxSidePanelWidth(containerWidth);
    }

    if (nextWidth === undefined) {
      return;
    }

    event.preventDefault();
    setWidth(clampSidePanelWidth(nextWidth, containerWidth));
  }

  return (
    <aside
      ref={rootRef}
      data-slot="side-panel"
      className="relative flex h-full shrink-0 flex-col border-r border-border bg-card"
      style={{ width }}
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            id={panelId(tab.id)}
            role="tabpanel"
            hidden={selected !== tab.id}
            aria-labelledby={`side-panel-tab-${tab.id}`}
            className="h-full"
          >
            {tab.id === "files" ? (
              <div className="flex h-full min-h-0 flex-col">
                <FileTree />
              </div>
            ) : tab.id === "config" ? (
              <Config />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">{tab.placeholder}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <TooltipProvider>
        <div
          role="tablist"
          aria-label="Side panel"
          className="flex h-6 shrink-0 border-t border-border"
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
                        ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                    onClick={() => {
                      selectTab(tab.id);
                    }}
                    onKeyDown={(event) => {
                      onTabKeyDown(event, tab.id);
                    }}
                  >
                    <Icon aria-hidden="true" className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tab.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      <div
        role="slider"
        data-slot="side-panel-resize"
        aria-orientation="vertical"
        aria-label="Resize side panel"
        tabIndex={0}
        aria-valuemin={MIN_SIDE_PANEL_WIDTH}
        aria-valuemax={maxSidePanelWidth(containerWidth)}
        aria-valuenow={width}
        className="absolute top-0 right-0 z-10 m-0 h-full w-2 translate-x-1/2 cursor-col-resize touch-none border-0 bg-transparent p-0"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={onHandleKeyDown}
        onDoubleClick={() => {
          setWidth(DEFAULT_SIDE_PANEL_WIDTH);
        }}
      />
    </aside>
  );
}
