import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  type WindowControlHandlers,
} from "@gencore/ui-kit";

export function TitlebarContextMenu({
  onClose,
  onMinimize,
  onToggleMaximize,
}: WindowControlHandlers) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={() => onMinimize?.()}>Minimize</ContextMenuItem>
      <ContextMenuItem onSelect={() => onToggleMaximize?.()}>Maximize</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onSelect={() => onClose?.()}>
        Close
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
