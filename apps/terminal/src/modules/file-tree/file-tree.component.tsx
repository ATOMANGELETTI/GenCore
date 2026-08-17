import {
  Button,
  cn,
  FileIcon,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tree,
  type TreeRow,
} from "@gencore/ui-kit";
import { FilePlus, FolderPlus, FoldVertical, RefreshCw } from "lucide-react";
import * as React from "react";
import { useFileTree } from "./file-tree.hook";
import {
  FILE_TREE_CREATE_ID,
  type FileTreeCreateDraft,
  type FileTreeNode,
} from "./file-tree.types";

function nodeKindOf(node: FileTreeNode): "drive" | "folder" | "file" {
  if (node.kind === "drive") {
    return "drive";
  }
  if (node.kind === "dir") {
    return "folder";
  }
  return "file";
}

function CreateNameInput({
  draft,
  onCommit,
  onCancel,
}: {
  draft: FileTreeCreateDraft;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = React.useState("");
  const doneRef = React.useRef(false);
  const errorId = React.useId();

  React.useEffect(() => {
    if (draft.error) {
      doneRef.current = false;
    }
  }, [draft.error]);

  function finish(next: string | null) {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    if (next?.trim()) {
      onCommit(next);
      return;
    }
    onCancel();
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Input
        autoFocus
        autoComplete="off"
        spellCheck={false}
        aria-label={draft.kind === "dir" ? "Folder name" : "File name"}
        aria-invalid={draft.error ? true : undefined}
        aria-describedby={draft.error ? errorId : undefined}
        value={value}
        className={cn("h-5 min-w-0 w-full px-1", draft.error && "border-destructive")}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            finish(event.currentTarget.value);
          } else if (event.key === "Escape") {
            event.preventDefault();
            finish(null);
          }
        }}
        onBlur={(event) => {
          finish(event.currentTarget.value.trim() ? event.currentTarget.value : null);
        }}
      />
      {draft.error ? (
        <p id={errorId} className="absolute top-full left-0 z-10 text-destructive text-[10px]">
          {draft.error}
        </p>
      ) : null}
    </div>
  );
}

export function FileTree() {
  const tree = useFileTree();
  const createDisabled = tree.selectedId == null;

  function renderLeading(row: TreeRow) {
    if (row.id === FILE_TREE_CREATE_ID && tree.create) {
      return <FileIcon nodeKind={tree.create.kind === "dir" ? "folder" : "file"} />;
    }

    const node = tree.nodes[row.id];
    if (!node) {
      return null;
    }

    return (
      <FileIcon
        nodeKind={nodeKindOf(node)}
        open={node.kind === "dir" && node.expanded}
        extension={node.extension ?? undefined}
      />
    );
  }

  function renderName(row: TreeRow) {
    if (row.id === FILE_TREE_CREATE_ID && tree.create) {
      return (
        <CreateNameInput
          draft={tree.create}
          onCommit={(name) => {
            void tree.commitCreate(name);
          }}
          onCancel={tree.cancelCreate}
        />
      );
    }

    const node = tree.nodes[row.id];
    if (!node) {
      return row.name;
    }

    if (node.kind === "drive" && node.label) {
      return (
        <>
          <span>{node.name}</span>
          <span className="text-muted-foreground"> {node.label}</span>
        </>
      );
    }

    return node.name;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TooltipProvider>
        <div className="flex h-7 select-none items-center justify-between border-b border-border px-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            FILES
          </span>
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="New File"
                  disabled={createDisabled}
                  onClick={() => {
                    void tree.startCreate("file");
                  }}
                >
                  <FilePlus aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New File</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="New Folder"
                  disabled={createDisabled}
                  onClick={() => {
                    void tree.startCreate("dir");
                  }}
                >
                  <FolderPlus aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Folder</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Refresh"
                  onClick={() => {
                    void tree.refresh();
                  }}
                >
                  <RefreshCw
                    aria-hidden="true"
                    className={cn(tree.refreshing && "animate-spin motion-reduce:animate-none")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Collapse All"
                  onClick={tree.collapseAll}
                >
                  <FoldVertical aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse All</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Tree
          rows={tree.rows}
          onSelect={tree.onSelect}
          onToggle={tree.onToggle}
          renderLeading={renderLeading}
          renderName={renderName}
          className="min-h-0 h-full flex-1"
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
