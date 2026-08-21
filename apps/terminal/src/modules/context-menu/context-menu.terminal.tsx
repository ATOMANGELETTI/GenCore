import { ContextMenuContent, ContextMenuItem, ContextMenuShortcut } from "@gencore/ui-kit";
import * as React from "react";
import { useTerminalSession } from "../terminal/terminal.hook";
import { canReadClipboard } from "./context-menu.clipboard";

export function TerminalContextMenu() {
  const { clipboard } = useTerminalSession();
  const [canPaste, setCanPaste] = React.useState(false);
  const [hasSelection, setHasSelection] = React.useState(false);

  return (
    <ContextMenuContent
      onOpenAutoFocus={() => {
        setHasSelection(clipboard.hasSelection());
        void canReadClipboard().then(setCanPaste);
      }}
    >
      <ContextMenuItem
        disabled={!hasSelection}
        onSelect={() => {
          void clipboard.copy();
        }}
      >
        Copy
        <ContextMenuShortcut>Ctrl+Shift+C</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!canPaste}
        onSelect={() => {
          void clipboard.paste();
        }}
      >
        Paste
        <ContextMenuShortcut>Ctrl+Shift+V</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => clipboard.selectAll()}>Select All</ContextMenuItem>
    </ContextMenuContent>
  );
}

export function TabContextMenu({
  pinned,
  onRename,
  onTogglePin,
  onClose,
  onCloseOthers,
  onCloseUnpinned,
}: {
  pinned: boolean;
  onRename: () => void;
  onTogglePin: () => void;
  onClose: () => void;
  onCloseOthers: () => void;
  onCloseUnpinned: () => void;
}) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={onRename}>Rename</ContextMenuItem>
      <ContextMenuItem onSelect={onTogglePin}>{pinned ? "Unpin" : "Pin"}</ContextMenuItem>
      <ContextMenuItem onSelect={onClose}>Close</ContextMenuItem>
      <ContextMenuItem onSelect={onCloseOthers}>Close Others</ContextMenuItem>
      <ContextMenuItem onSelect={onCloseUnpinned}>Close Unpinned</ContextMenuItem>
    </ContextMenuContent>
  );
}
