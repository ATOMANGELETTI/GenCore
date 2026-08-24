import { SourceControlProvider, useSourceControlContext } from "./source-control.hook";
import { ActiveRepoView } from "./views/active-repo-view.component";
import { InitRepoView } from "./views/init-repo-view.component";
import { NoFolderView } from "./views/no-folder-view.component";

function SourceControlContent() {
  const { folderPath, isGitRepo, loading } = useSourceControlContext();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
        Loading source control...
      </div>
    );
  }

  if (!folderPath) {
    return <NoFolderView />;
  }

  if (!isGitRepo) {
    return <InitRepoView folderPath={folderPath} />;
  }

  return <ActiveRepoView />;
}

export function SourceControl() {
  return (
    <SourceControlProvider>
      <SourceControlContent />
    </SourceControlProvider>
  );
}
