import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@gencore/ui-kit";

export interface FileListBackgroundMenuProps {
  readonly canPaste: boolean;
  onNewFile: () => void;
  onNewFolder: () => void;
  onPaste: () => void;
  onRefresh: () => void;
}

export function FileListBackgroundMenu({
  canPaste,
  onNewFile,
  onNewFolder,
  onPaste,
  onRefresh,
}: FileListBackgroundMenuProps) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={onNewFile}>New File</ContextMenuItem>
      <ContextMenuItem onSelect={onNewFolder}>New Folder</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem disabled={!canPaste} onSelect={onPaste}>
        Paste
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onRefresh}>Refresh</ContextMenuItem>
    </ContextMenuContent>
  );
}
