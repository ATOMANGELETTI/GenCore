import * as React from "react";
import { FileTree } from "../file-tree/file-tree.component";
import { gitPickFolder } from "../ipc/ipc.git";
import { SourceControl } from "../source-control/source-control.component";
import {
  readActiveFilesSubview,
  readWorkspaceFolder,
  writeActiveFilesSubview,
  writeWorkspaceFolder,
} from "./files.storage";
import { FilesToolbar } from "./files.toolbar";
import type { FilesSubviewId } from "./files.types";

export function Files() {
  const [activeSubview, setActiveSubview] = React.useState<FilesSubviewId>(() =>
    readActiveFilesSubview(),
  );
  const [hasFolder, setHasFolder] = React.useState<boolean>(() => readWorkspaceFolder() !== null);

  function handleSelectSubview(id: FilesSubviewId) {
    setActiveSubview(id);
    writeActiveFilesSubview(id);
  }

  async function handleOpenFolder() {
    try {
      const picked = await gitPickFolder();
      if (picked) {
        writeWorkspaceFolder(picked);
        setHasFolder(true);
        window.dispatchEvent(new Event("focus"));
      }
    } catch {
      // ignore
    }
  }

  function handleCloseFolder() {
    writeWorkspaceFolder(null);
    setHasFolder(false);
    window.dispatchEvent(new Event("focus"));
  }

  return (
    <div data-slot="files-panel" className="flex h-full min-h-0 flex-col bg-card">
      <FilesToolbar
        activeSubview={activeSubview}
        onSelectSubview={handleSelectSubview}
        hasWorkspaceFolder={hasFolder}
        onOpenFolder={handleOpenFolder}
        onCloseFolder={handleCloseFolder}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeSubview === "explorer" ? <FileTree /> : <SourceControl />}
      </div>
    </div>
  );
}
