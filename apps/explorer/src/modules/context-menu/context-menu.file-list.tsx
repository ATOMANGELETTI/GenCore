import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@gencore/ui-kit";

export interface FileListEntryMenuProps {
  readonly selectionCount: number;
  onOpen: () => void;
  onCut: () => void;
  onCopy: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
}

export function FileListEntryMenu({
  selectionCount,
  onOpen,
  onCut,
  onCopy,
  onRename,
  onDelete,
  onCopyPath,
}: FileListEntryMenuProps) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={onOpen}>Open</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onCut}>Cut</ContextMenuItem>
      <ContextMenuItem onSelect={onCopy}>Copy</ContextMenuItem>
      {selectionCount <= 1 ? <ContextMenuItem onSelect={onRename}>Rename</ContextMenuItem> : null}
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onCopyPath}>Copy Path</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onSelect={onDelete}>
        Delete{selectionCount > 1 ? ` (${selectionCount})` : ""}
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
