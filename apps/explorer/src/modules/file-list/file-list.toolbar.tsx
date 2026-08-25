import {
  Button,
  cn,
  Input,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gencore/ui-kit";
import { ArrowLeft, ArrowRight, ArrowUp, FolderPlus, RefreshCw, Search } from "lucide-react";
import * as React from "react";
import type { BreadcrumbSegment } from "../navigation/navigation.types";

interface FileListToolbarProps {
  readonly path: string;
  readonly breadcrumbs: readonly BreadcrumbSegment[];
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly filterText: string;
  readonly busy: boolean;
  onBack: () => void;
  onForward: () => void;
  onUp: () => void;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onNewFolder: () => void;
  onFilterChange: (value: string) => void;
}

export function FileListToolbar({
  path,
  breadcrumbs,
  canGoBack,
  canGoForward,
  filterText,
  busy,
  onBack,
  onForward,
  onUp,
  onNavigate,
  onRefresh,
  onNewFolder,
  onFilterChange,
}: FileListToolbarProps) {
  const [editingAddress, setEditingAddress] = React.useState(false);
  const [draftAddress, setDraftAddress] = React.useState(path);
  const addressInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!editingAddress) {
      setDraftAddress(path);
    }
  }, [path, editingAddress]);

  function startEditingAddress() {
    setDraftAddress(path);
    setEditingAddress(true);
  }

  function commitAddress() {
    const trimmed = draftAddress.trim();
    setEditingAddress(false);
    if (trimmed && trimmed !== path) {
      onNavigate(trimmed);
    }
  }

  React.useEffect(() => {
    if (editingAddress) {
      addressInputRef.current?.focus();
      addressInputRef.current?.select();
    }
  }, [editingAddress]);

  return (
    <div
      data-slot="file-list-toolbar"
      className="flex shrink-0 flex-col gap-1.5 border-b border-border p-1.5"
    >
      <div className="flex items-center gap-1">
        <IconButton label="Back" disabled={!canGoBack} onClick={onBack}>
          <ArrowLeft />
        </IconButton>
        <IconButton label="Forward" disabled={!canGoForward} onClick={onForward}>
          <ArrowRight />
        </IconButton>
        <IconButton label="Up one level" disabled={!path} onClick={onUp}>
          <ArrowUp />
        </IconButton>

        <Separator orientation="vertical" className="mx-1 h-4" />

        {editingAddress ? (
          <Input
            ref={addressInputRef}
            value={draftAddress}
            onChange={(event) => setDraftAddress(event.target.value)}
            onBlur={commitAddress}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitAddress();
              } else if (event.key === "Escape") {
                setEditingAddress(false);
                setDraftAddress(path);
              }
            }}
            className="h-7 flex-1 font-mono text-xs"
            aria-label="Address"
          />
        ) : (
          <div className="flex h-7 min-w-0 flex-1 items-center gap-0.5 truncate rounded-sm px-2 text-xs hover:bg-accent">
            {breadcrumbs.length === 0 ? (
              <span className="text-muted-foreground">This PC</span>
            ) : (
              breadcrumbs.map((segment, index) => (
                <React.Fragment key={segment.path}>
                  {index > 0 && <span className="text-muted-foreground">/</span>}
                  <button
                    type="button"
                    className="rounded-sm px-1 py-0.5 hover:bg-accent hover:underline"
                    onClick={() => onNavigate(segment.path)}
                  >
                    {segment.label}
                  </button>
                </React.Fragment>
              ))
            )}
            <button
              type="button"
              aria-label="Edit address"
              onClick={startEditingAddress}
              className="h-full min-w-4 flex-1"
            />
          </div>
        )}

        <IconButton label="Refresh" onClick={onRefresh}>
          <RefreshCw className={cn(busy && "animate-spin")} />
        </IconButton>

        <Separator orientation="vertical" className="mx-1 h-4" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onNewFolder} className="h-7 gap-1.5 px-2">
              <FolderPlus className="size-3.5" />
              New folder
            </Button>
          </TooltipTrigger>
          <TooltipContent>New folder (this location)</TooltipContent>
        </Tooltip>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filterText}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Filter this folder"
          className="h-7 pl-7 text-xs"
          aria-label="Filter this folder"
        />
      </div>
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
