import * as React from "react";
import { FileTree } from "../file-tree/file-tree.component";
import { SourceControl } from "../source-control/source-control.component";
import { readActiveFilesSubview, writeActiveFilesSubview } from "./files.storage";
import { FilesToolbar } from "./files.toolbar";
import type { FilesSubviewId } from "./files.types";

export function Files() {
  const [activeSubview, setActiveSubview] = React.useState<FilesSubviewId>(() =>
    readActiveFilesSubview(),
  );

  function handleSelectSubview(id: FilesSubviewId) {
    setActiveSubview(id);
    writeActiveFilesSubview(id);
  }

  return (
    <div data-slot="files-panel" className="flex h-full min-h-0 flex-col bg-card">
      <FilesToolbar activeSubview={activeSubview} onSelectSubview={handleSelectSubview} />
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeSubview === "explorer" ? <FileTree /> : <SourceControl />}
      </div>
    </div>
  );
}
