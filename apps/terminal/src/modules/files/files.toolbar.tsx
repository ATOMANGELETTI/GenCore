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
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  Folder,
  FolderOpen,
  FolderX,
  GitBranch,
  GitBranchPlus,
  GitFork,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import * as React from "react";
import type { FilesCategoryItem, FilesSubviewId } from "./files.types";

export interface FilesToolbarProps {
  activeSubview: FilesSubviewId;
  onSelectSubview: (id: FilesSubviewId) => void;
  changesCount?: number;
  hasWorkspaceFolder?: boolean;
  onOpenFolder?: () => void;
  onCloseFolder?: () => void;
  onRefresh?: () => void;
  onStageAll?: () => void;
  onUnstageAll?: () => void;
  onDiscardAll?: () => void;
  onStashSave?: () => void;
  onStashPop?: () => void;
  onSwitchBranch?: () => void;
  onCreateBranch?: () => void;
}

export function FilesToolbar({
  activeSubview,
  onSelectSubview,
  changesCount = 0,
  hasWorkspaceFolder = false,
  onOpenFolder,
  onCloseFolder,
  onRefresh,
  onStageAll,
  onUnstageAll,
  onDiscardAll,
  onStashSave,
  onStashPop,
  onSwitchBranch,
  onCreateBranch,
}: FilesToolbarProps) {
  const tabRefs = React.useRef<Partial<Record<FilesSubviewId, HTMLButtonElement | null>>>({});

  const categories: readonly FilesCategoryItem[] = React.useMemo(
    () => [
      { id: "explorer", label: "Explorer", Icon: Folder },
      {
        id: "source-control",
        label: "Source Control",
        Icon: GitBranch,
        badgeCount: changesCount > 0 ? changesCount : undefined,
      },
    ],
    [changesCount],
  );

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, currentId: FilesSubviewId) {
    const currentIndex = categories.findIndex((cat) => cat.id === currentId);
    if (currentIndex < 0) {
      return;
    }

    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % categories.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + categories.length) % categories.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = categories.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      const nextCategory = categories[nextIndex];
      if (nextCategory) {
        onSelectSubview(nextCategory.id);
        tabRefs.current[nextCategory.id]?.focus();
      }
    }
  }

  return (
    <div
      data-slot="files-toolbar"
      className="flex h-9 shrink-0 select-none items-center justify-between border-b border-border/60 bg-card px-2"
    >
      <TooltipProvider>
        <div role="tablist" aria-label="Files views" className="flex items-center gap-1">
          {categories.map((category) => {
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
                      "relative size-7 rounded-md p-0 transition-colors",
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
                    {category.badgeCount !== undefined && category.badgeCount > 0 ? (
                      <span
                        data-slot="changes-badge"
                        className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground leading-none shadow-xs"
                      >
                        {category.badgeCount > 99 ? "99+" : category.badgeCount}
                      </span>
                    ) : null}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {category.label}
                  {category.badgeCount ? ` (${category.badgeCount})` : ""}
                </TooltipContent>
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
            aria-label="Files actions"
            className="size-7 rounded-md p-0 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          >
            <ChevronDown aria-hidden="true" className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {onOpenFolder ? (
            <DropdownMenuItem className="flex items-center gap-2" onClick={onOpenFolder}>
              <FolderOpen className="size-3.5 text-primary" aria-hidden="true" />
              <span>Open Folder...</span>
            </DropdownMenuItem>
          ) : null}

          {onRefresh ? (
            <DropdownMenuItem className="flex items-center gap-2" onClick={onRefresh}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              <span>Refresh</span>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          {categories.map((cat) => {
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

          {activeSubview === "source-control" ? (
            <>
              <DropdownMenuSeparator />
              {onStageAll ? (
                <DropdownMenuItem className="flex items-center gap-2" onClick={onStageAll}>
                  <Plus className="size-3.5 text-success" aria-hidden="true" />
                  <span>Stage All Changes</span>
                </DropdownMenuItem>
              ) : null}
              {onUnstageAll ? (
                <DropdownMenuItem className="flex items-center gap-2" onClick={onUnstageAll}>
                  <Minus className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span>Unstage All Changes</span>
                </DropdownMenuItem>
              ) : null}
              {onDiscardAll ? (
                <DropdownMenuItem
                  variant="destructive"
                  className="flex items-center gap-2"
                  onClick={onDiscardAll}
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  <span>Discard All Changes</span>
                </DropdownMenuItem>
              ) : null}

              {onStashSave || onStashPop ? (
                <>
                  <DropdownMenuSeparator />
                  {onStashSave ? (
                    <DropdownMenuItem className="flex items-center gap-2" onClick={onStashSave}>
                      <Archive className="size-3.5" aria-hidden="true" />
                      <span>Stash Changes...</span>
                    </DropdownMenuItem>
                  ) : null}
                  {onStashPop ? (
                    <DropdownMenuItem className="flex items-center gap-2" onClick={onStashPop}>
                      <ArchiveRestore className="size-3.5" aria-hidden="true" />
                      <span>Pop Stash</span>
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : null}

              {onSwitchBranch || onCreateBranch ? (
                <>
                  <DropdownMenuSeparator />
                  {onSwitchBranch ? (
                    <DropdownMenuItem className="flex items-center gap-2" onClick={onSwitchBranch}>
                      <GitFork className="size-3.5" aria-hidden="true" />
                      <span>Switch Branch...</span>
                    </DropdownMenuItem>
                  ) : null}
                  {onCreateBranch ? (
                    <DropdownMenuItem className="flex items-center gap-2" onClick={onCreateBranch}>
                      <GitBranchPlus className="size-3.5" aria-hidden="true" />
                      <span>Create Branch...</span>
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {hasWorkspaceFolder && onCloseFolder ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="flex items-center gap-2"
                onClick={onCloseFolder}
              >
                <FolderX className="size-3.5" aria-hidden="true" />
                <span>Close Workspace Folder</span>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
