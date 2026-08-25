import { FileIcon, Tree } from "@gencore/ui-kit";
import { useFolderTree } from "./folder-tree.hook";

interface FolderTreeProps {
  readonly currentPath: string;
  onNavigate: (path: string) => void;
}

export function FolderTree({ currentPath, onNavigate }: FolderTreeProps) {
  const { rows, onSelect, onToggle } = useFolderTree(currentPath, onNavigate);

  return (
    <div data-slot="folder-tree" className="flex h-full min-h-0 flex-col bg-card">
      <Tree
        rows={rows}
        onSelect={onSelect}
        onToggle={onToggle}
        renderLeading={(row) => (
          <FileIcon
            className="size-3.5 shrink-0"
            nodeKind={row.depth === 0 ? "drive" : "folder"}
            open={row.expanded}
          />
        )}
      />
    </div>
  );
}
