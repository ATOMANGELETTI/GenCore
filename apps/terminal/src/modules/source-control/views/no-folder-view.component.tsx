import { Button } from "@gencore/ui-kit";
import { FolderOpen } from "lucide-react";
import { useSourceControlContext } from "../source-control.hook";

export function NoFolderView() {
  const { openFolderPicker } = useSourceControlContext();

  return (
    <div
      data-slot="no-folder-view"
      className="flex h-full flex-col items-center justify-center p-6 text-center select-none"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-accent/50 text-muted-foreground ring-1 ring-border/50 mb-4">
        <FolderOpen className="size-6 text-primary" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">No Folder Opened</h3>
      <p className="text-xs text-muted-foreground max-w-xs mb-5 leading-relaxed">
        You have not yet opened a folder. Open a workspace folder to view and manage source control
        changes.
      </p>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="gap-2 shadow-xs"
        onClick={() => {
          void openFolderPicker();
        }}
      >
        <FolderOpen className="size-4" aria-hidden="true" />
        <span>Open Folder</span>
      </Button>
    </div>
  );
}
