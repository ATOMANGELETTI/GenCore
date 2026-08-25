import { ContextMenu, ContextMenuTrigger, cn, FileIcon } from "@gencore/ui-kit";
import { observeElementRect, useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp, FolderOpen } from "lucide-react";
import * as React from "react";
import { useConfig } from "../config/config.hook";
import { FileListEntryMenu } from "../context-menu/context-menu.file-list";
import { FileListBackgroundMenu } from "../context-menu/context-menu.file-list-background";
import type { FileOpsApi } from "../file-ops/file-ops.types";
import { openFile } from "../ipc/ipc.opener";
import type { FsEntry } from "../ipc/ipc.types";
import type { NavigationApi } from "../navigation/navigation.types";
import {
  displayName,
  formatModified,
  formatSize,
  typeLabel,
  uniqueEntryName,
} from "./file-list.format";
import { FileListToolbar } from "./file-list.toolbar";
import type { FileListApi, SortKey } from "./file-list.types";

const ROW_SIZE = 26;

interface Column {
  readonly key: SortKey;
  readonly label: string;
  readonly className: string;
}

const COLUMNS: readonly Column[] = [
  { key: "name", label: "Name", className: "flex-1 min-w-0" },
  { key: "size", label: "Size", className: "w-20 shrink-0 text-right" },
  { key: "type", label: "Type", className: "w-32 shrink-0" },
  { key: "modified", label: "Date modified", className: "w-40 shrink-0" },
];

interface FileListProps {
  readonly navigation: NavigationApi;
  readonly fileList: FileListApi;
  readonly fileOps: FileOpsApi;
}

export function FileList({ navigation, fileList, fileOps }: FileListProps) {
  const { showFileExtensions, confirmBeforeDelete } = useConfig();
  const [renamingPath, setRenamingPath] = React.useState<string | null>(null);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: fileList.entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_SIZE,
    getItemKey: (index) => fileList.entries[index]?.path ?? index,
    observeElementRect,
    overscan: 8,
  });

  const openEntry = React.useCallback(
    async (entry: FsEntry) => {
      if (entry.kind === "dir") {
        navigation.navigateTo(entry.path);
      } else {
        await openFile(entry.path).catch(() => undefined);
      }
    },
    [navigation],
  );

  const startRename = React.useCallback((path: string) => {
    setRenamingPath(path);
  }, []);

  const commitRename = React.useCallback(
    async (path: string, newName: string) => {
      setRenamingPath(null);
      const trimmed = newName.trim();
      if (!trimmed) {
        return;
      }
      const result = await fileOps.renameEntry(path, trimmed);
      if (result) {
        await fileList.refresh();
      }
    },
    [fileOps, fileList],
  );

  const handleNewFolder = React.useCallback(async () => {
    const name = uniqueEntryName(
      fileList.entries.map((entry) => entry.name),
      "New folder",
    );
    await fileOps.createNewDir(navigation.path, name);
    await fileList.refresh();
  }, [fileList, fileOps, navigation.path]);

  const handleNewFile = React.useCallback(async () => {
    const name = uniqueEntryName(
      fileList.entries.map((entry) => entry.name),
      "New file.txt",
    );
    await fileOps.createNewFile(navigation.path, name);
    await fileList.refresh();
  }, [fileList, fileOps, navigation.path]);

  const handleDelete = React.useCallback(
    async (paths: readonly string[]) => {
      if (paths.length === 0) {
        return;
      }
      if (confirmBeforeDelete) {
        const label = paths.length === 1 ? "this item" : `these ${paths.length} items`;
        if (!window.confirm(`Move ${label} to the Recycle Bin?`)) {
          return;
        }
      }
      await fileOps.deleteEntries(paths);
      await fileList.refresh();
    },
    [confirmBeforeDelete, fileOps, fileList],
  );

  const handlePaste = React.useCallback(async () => {
    await fileOps.pasteInto(navigation.path);
    await fileList.refresh();
  }, [fileList, fileOps, navigation.path]);

  function selectionForAction(path: string): readonly string[] {
    return fileList.selectedPaths.has(path) ? [...fileList.selectedPaths] : [path];
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        return;
      }
      if (!parentRef.current?.contains(active) && active !== parentRef.current) {
        return;
      }

      const selected = [...fileList.selectedPaths];
      const ctrlOrCmd = event.ctrlKey || event.metaKey;

      if (event.key === "Delete" && selected.length > 0) {
        event.preventDefault();
        void handleDelete(selected);
      } else if (event.key === "F2" && selected.length === 1 && selected[0]) {
        event.preventDefault();
        startRename(selected[0]);
      } else if (ctrlOrCmd && event.key.toLowerCase() === "c" && selected.length > 0) {
        event.preventDefault();
        fileOps.copyToClipboard(selected);
      } else if (ctrlOrCmd && event.key.toLowerCase() === "x" && selected.length > 0) {
        event.preventDefault();
        fileOps.cutToClipboard(selected);
      } else if (ctrlOrCmd && event.key.toLowerCase() === "v" && fileOps.clipboard) {
        event.preventDefault();
        void handlePaste();
      } else if (ctrlOrCmd && event.key.toLowerCase() === "a") {
        event.preventDefault();
        fileList.selectAll();
      } else if (event.key === "F5") {
        event.preventDefault();
        void fileList.refresh();
      } else if (event.key === "Enter" && selected.length === 1) {
        const entry = fileList.entries.find((candidate) => candidate.path === selected[0]);
        if (entry) {
          event.preventDefault();
          void openEntry(entry);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fileList, fileOps, handleDelete, handlePaste, openEntry, startRename]);

  return (
    <div data-slot="file-list" className="flex h-full min-h-0 flex-col">
      <FileListToolbar
        path={navigation.path}
        breadcrumbs={navigation.breadcrumbs}
        canGoBack={navigation.canGoBack}
        canGoForward={navigation.canGoForward}
        filterText={fileList.filterText}
        busy={fileList.loading}
        onBack={navigation.back}
        onForward={navigation.forward}
        onUp={navigation.up}
        onNavigate={navigation.navigateTo}
        onRefresh={() => void fileList.refresh()}
        onNewFolder={() => void handleNewFolder()}
        onFilterChange={fileList.setFilterText}
      />

      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-border px-2 text-xs font-medium text-muted-foreground">
        {COLUMNS.map((column) => (
          <button
            key={column.key}
            type="button"
            className={cn(
              "flex items-center gap-1 truncate rounded-sm px-1 py-0.5 hover:bg-accent hover:text-foreground",
              column.className,
            )}
            onClick={() => fileList.setSort(column.key)}
          >
            <span className="truncate">{column.label}</span>
            {fileList.sort.key === column.key ? (
              fileList.sort.direction === "asc" ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )
            ) : null}
          </button>
        ))}
      </div>

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={parentRef}
            role="listbox"
            aria-multiselectable="true"
            tabIndex={0}
            className="min-h-0 flex-1 overflow-auto outline-none"
          >
            {navigation.path && !fileList.loading && fileList.entries.length === 0 ? (
              <EmptyState
                hasFilter={fileList.filterText.trim().length > 0}
                error={fileList.error}
              />
            ) : (
              <div
                className="relative w-full"
                style={{ height: `${virtualizer.getTotalSize()}px` }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const entry = fileList.entries[virtualRow.index];
                  if (!entry) {
                    return null;
                  }
                  return (
                    <FileListRow
                      key={virtualRow.key}
                      entry={entry}
                      showFileExtensions={showFileExtensions}
                      selected={fileList.selectedPaths.has(entry.path)}
                      renaming={renamingPath === entry.path}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      onSelect={(options) => fileList.selectEntry(entry.path, options)}
                      onOpen={() => void openEntry(entry)}
                      onStartRename={() => startRename(entry.path)}
                      onCommitRename={(name) => void commitRename(entry.path, name)}
                      onCancelRename={() => setRenamingPath(null)}
                      onCut={() => fileOps.cutToClipboard(selectionForAction(entry.path))}
                      onCopy={() => fileOps.copyToClipboard(selectionForAction(entry.path))}
                      onDelete={() => void handleDelete(selectionForAction(entry.path))}
                      onCopyPath={() =>
                        void navigator.clipboard.writeText(entry.path).catch(() => undefined)
                      }
                      selectionCount={selectionForAction(entry.path).length}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <FileListBackgroundMenu
          canPaste={fileOps.clipboard != null}
          onNewFile={() => void handleNewFile()}
          onNewFolder={() => void handleNewFolder()}
          onPaste={() => void handlePaste()}
          onRefresh={() => void fileList.refresh()}
        />
      </ContextMenu>
    </div>
  );
}

function EmptyState({ hasFilter, error }: { hasFilter: boolean; error: string | null }) {
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-destructive">
        <span>{error}</span>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <FolderOpen className="size-8 opacity-50" aria-hidden="true" />
      <span>{hasFilter ? "No items match your filter" : "This folder is empty"}</span>
    </div>
  );
}

interface FileListRowProps {
  readonly entry: FsEntry;
  readonly showFileExtensions: boolean;
  readonly selected: boolean;
  readonly renaming: boolean;
  readonly style: React.CSSProperties;
  readonly selectionCount: number;
  onSelect: (options?: { additive?: boolean; range?: boolean }) => void;
  onOpen: () => void;
  onStartRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onCut: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
}

function FileListRow({
  entry,
  showFileExtensions,
  selected,
  renaming,
  style,
  selectionCount,
  onSelect,
  onOpen,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onCut,
  onCopy,
  onDelete,
  onCopyPath,
}: FileListRowProps) {
  const [draftName, setDraftName] = React.useState(entry.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (renaming) {
      setDraftName(entry.name);
    }
  }, [renaming, entry.name]);

  React.useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* Keyboard lives on role="listbox" (single tab stop). Items are not in the tab order. */}
        {/* biome-ignore lint/a11y/useFocusableInteractive: ARIA listbox pattern */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: ARIA listbox pattern */}
        <div
          role="option"
          aria-selected={selected}
          data-slot="file-list-row"
          className={cn(
            "flex items-center gap-2 border-b border-border/40 px-2 text-xs",
            selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          )}
          style={style}
          onClick={(event) => {
            if (renaming) {
              return;
            }
            onSelect({ additive: event.ctrlKey || event.metaKey, range: event.shiftKey });
          }}
          onDoubleClick={() => {
            if (!renaming) {
              onOpen();
            }
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <FileIcon
              className="size-4 shrink-0"
              nodeKind={entry.kind === "dir" ? "folder" : "file"}
              extension={entry.extension ?? undefined}
            />
            {renaming ? (
              <input
                ref={inputRef}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onBlur={() => onCommitRename(draftName)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onCommitRename(draftName);
                  } else if (event.key === "Escape") {
                    onCancelRename();
                  }
                  event.stopPropagation();
                }}
                className="h-5 min-w-0 flex-1 rounded-sm border border-ring bg-background px-1 text-xs outline-none"
              />
            ) : (
              <span className="truncate" title={entry.name}>
                {displayName(entry, showFileExtensions)}
              </span>
            )}
          </div>
          <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
            {formatSize(entry.size)}
          </span>
          <span className="w-32 shrink-0 truncate text-muted-foreground">{typeLabel(entry)}</span>
          <span className="w-40 shrink-0 truncate tabular-nums text-muted-foreground">
            {formatModified(entry.modifiedMs)}
          </span>
        </div>
      </ContextMenuTrigger>
      <FileListEntryMenu
        selectionCount={selectionCount}
        onOpen={onOpen}
        onCut={onCut}
        onCopy={onCopy}
        onRename={onStartRename}
        onDelete={onDelete}
        onCopyPath={onCopyPath}
      />
    </ContextMenu>
  );
}
