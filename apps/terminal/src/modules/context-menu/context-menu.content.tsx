import { ContextMenuContent, ContextMenuItem, ContextMenuShortcut } from "@gencore/ui-kit";
import * as React from "react";
import {
  canReadClipboard,
  copySelection,
  cutSelection,
  hasTextSelection,
  pasteText,
  selectAllContent,
} from "./context-menu.clipboard";

export function ContentContextMenu() {
  const [canPaste, setCanPaste] = React.useState(false);
  const [hasSelection, setHasSelection] = React.useState(false);

  return (
    <ContextMenuContent
      onOpenAutoFocus={() => {
        setHasSelection(hasTextSelection());
        void canReadClipboard().then(setCanPaste);
      }}
    >
      <ContextMenuItem disabled={!hasSelection} onSelect={cutSelection}>
        Cut
        <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem disabled={!hasSelection} onSelect={copySelection}>
        Copy
        <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!canPaste}
        onSelect={() => {
          void pasteText();
        }}
      >
        Paste
        <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={selectAllContent}>
        Select All
        <ContextMenuShortcut>Ctrl+A</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
