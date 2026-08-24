import { Button } from "@gencore/ui-kit";
import { FolderOpen, GitBranch } from "lucide-react";
import { useSourceControlContext } from "../source-control.hook";

export function InitRepoView({ folderPath }: { folderPath: string }) {
  const { initRepo, openFolderPicker, loading } = useSourceControlContext();
  const folderName = folderPath.split(/[/\\]/).pop() || folderPath;

  return (
    <div
      data-slot="init-repo-view"
      className="flex h-full flex-col items-center justify-center p-6 text-center select-none"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-accent/50 text-muted-foreground ring-1 ring-border/50 mb-4">
        <GitBranch className="size-6 text-primary" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">Not a Git Repository</h3>
      <p className="text-xs text-muted-foreground max-w-xs mb-2 leading-relaxed">
        The folder <span className="font-mono font-medium text-foreground">{folderName}</span> is
        not initialized with Git.
      </p>
      <p className="text-xs text-muted-foreground/80 max-w-xs mb-5 leading-relaxed">
        Initialize it as a Git repository to enable source control tracking, staging, and commit
        history.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={loading}
          className="gap-2 shadow-xs w-full"
          onClick={() => {
            void initRepo();
          }}
        >
          <GitBranch className="size-4" aria-hidden="true" />
          <span>Initialize Repository</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading}
          className="gap-2 text-muted-foreground hover:text-foreground w-full"
          onClick={() => {
            void openFolderPicker();
          }}
        >
          <FolderOpen className="size-4" aria-hidden="true" />
          <span>Open Another Folder...</span>
        </Button>
      </div>
    </div>
  );
}
