import type { TreeRow } from "@gencore/ui-kit";
import * as React from "react";
import {
  createDir,
  createFile,
  listDir,
  listDrives,
  subscribeFsChanges,
  unwatchDir,
  watchDir,
} from "../ipc/ipc.fs";
import type { DriveEntry, FsEntry } from "../ipc/ipc.types";
import {
  FILE_TREE_CREATE_ID,
  type FilesSelection,
  type FileTreeCreateDraft,
  type FileTreeNode,
  type FileTreeNodeKind,
} from "./file-tree.types";

interface FileTreeState {
  roots: readonly string[];
  nodes: Record<string, FileTreeNode>;
  selectedId: string | null;
  create: FileTreeCreateDraft | null;
}

const INITIAL_STATE: FileTreeState = {
  roots: [],
  nodes: {},
  selectedId: null,
  create: null,
};

function joinWindowsPath(parent: string, name: string): string {
  return parent.endsWith("\\") ? `${parent}${name}` : `${parent}\\${name}`;
}

function parentWindowsPath(path: string): string {
  const trimmed = /^[A-Za-z]:\\$/.test(path)
    ? path
    : path.endsWith("\\")
      ? path.slice(0, -1)
      : path;
  const index = trimmed.lastIndexOf("\\");
  if (index < 0) {
    return path;
  }
  const parent = trimmed.slice(0, index);
  if (/^[A-Za-z]:$/.test(parent)) {
    return `${parent}\\`;
  }
  return parent;
}

function isExpandableKind(kind: FileTreeNodeKind): boolean {
  return kind === "drive" || kind === "dir";
}

function driveToNode(drive: DriveEntry, existing?: FileTreeNode): FileTreeNode {
  return {
    name: drive.name,
    path: drive.path,
    kind: "drive",
    extension: null,
    hidden: false,
    system: false,
    label: drive.label,
    expanded: existing?.expanded ?? false,
    children: existing?.children ?? [],
  };
}

function entryToNode(entry: FsEntry, existing?: FileTreeNode): FileTreeNode {
  return {
    name: entry.name,
    path: entry.path,
    kind: entry.kind,
    extension: entry.extension,
    hidden: entry.hidden,
    system: entry.system,
    label: null,
    expanded: existing?.expanded ?? false,
    children: existing?.children ?? [],
  };
}

function applyDrives(state: FileTreeState, drives: readonly DriveEntry[]): FileTreeState {
  const nodes = { ...state.nodes };
  for (const drive of drives) {
    nodes[drive.path] = driveToNode(drive, nodes[drive.path]);
  }
  return { ...state, roots: drives.map((drive) => drive.path), nodes };
}

function applyListing(
  state: FileTreeState,
  parentPath: string,
  entries: readonly FsEntry[],
  expanded = true,
): FileTreeState {
  const parent = state.nodes[parentPath];
  if (!parent) {
    return state;
  }

  const nodes = { ...state.nodes };
  const children = entries.map((entry) => entry.path);
  for (const entry of entries) {
    nodes[entry.path] = entryToNode(entry, nodes[entry.path]);
  }
  nodes[parentPath] = { ...parent, children, expanded };
  return { ...state, nodes };
}

function flattenRows(state: FileTreeState): TreeRow[] {
  const rows: TreeRow[] = [];

  function walk(path: string, depth: number) {
    const node = state.nodes[path];
    if (!node) {
      return;
    }

    rows.push({
      id: node.path,
      depth,
      name: node.name,
      expandable: isExpandableKind(node.kind),
      expanded: node.expanded,
      selected: state.selectedId === node.path,
      muted: node.hidden,
    });

    if (!node.expanded) {
      return;
    }

    if (state.create?.parentPath === path) {
      rows.push({
        id: FILE_TREE_CREATE_ID,
        depth: depth + 1,
        name: "",
        expandable: false,
        expanded: false,
        selected: false,
        overflowVisible: true,
      });
    }

    for (const child of node.children) {
      walk(child, depth + 1);
    }
  }

  for (const root of state.roots) {
    walk(root, 0);
  }

  return rows;
}

/** Drives have no `AssistantFilesSelection` equivalent on the Rust side; treat them as a directory. */
export function mapFileTreeKind(kind: FileTreeNodeKind): string {
  return kind === "drive" ? "dir" : kind;
}

export function toFilesSelection(
  nodes: Readonly<Record<string, FileTreeNode>>,
  selectedId: string | null,
): FilesSelection | null {
  if (selectedId == null) {
    return null;
  }
  const node = nodes[selectedId];
  if (!node) {
    return null;
  }
  return { path: node.path, kind: mapFileTreeKind(node.kind) };
}

function formatIpcError(error: unknown): string {
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return "Unable to create";
}

export function useFileTree() {
  const [state, setState] = React.useState<FileTreeState>(INITIAL_STATE);
  const [refreshing, setRefreshing] = React.useState(false);
  const stateRef = React.useRef(state);
  const committingRef = React.useRef(false);
  stateRef.current = state;

  const reloadDir = React.useCallback(async (path: string) => {
    const result = await listDir(path);
    setState((current) =>
      applyListing(current, path, result.entries, current.nodes[path]?.expanded ?? true),
    );
  }, []);

  const expand = React.useCallback(async (path: string) => {
    const result = await listDir(path);
    setState((current) => applyListing(current, path, result.entries, true));
    try {
      await watchDir(path);
    } catch {
      // Listing is still shown if watch fails.
    }
  }, []);

  const collapse = React.useCallback((path: string) => {
    setState((current) => {
      const node = current.nodes[path];
      if (!node) {
        return current;
      }
      return {
        ...current,
        nodes: { ...current.nodes, [path]: { ...node, expanded: false } },
      };
    });
    void unwatchDir(path).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void listDrives()
      .then(async (drives) => {
        if (cancelled) {
          return;
        }
        setState((current) => applyDrives(current, drives));
        const cDrive = drives.find((drive) => /^[Cc]:\\$/.test(drive.path));
        if (!cDrive) {
          return;
        }
        try {
          await expand(cDrive.path);
        } catch {
          // C: stays visible and collapsed.
        }
      })
      .catch(() => undefined);

    void subscribeFsChanges((payload) => {
      const parent = stateRef.current.nodes[payload.parent];
      if (!parent?.expanded) {
        return;
      }
      void reloadDir(payload.parent).catch(() => undefined);
    })
      .then((fn) => {
        if (cancelled) {
          fn();
          return;
        }
        unlisten = fn;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [expand, reloadDir]);

  function onSelect(id: string) {
    if (id === FILE_TREE_CREATE_ID) {
      return;
    }
    setState((current) => ({ ...current, selectedId: id }));
  }

  function onToggle(id: string) {
    if (id === FILE_TREE_CREATE_ID) {
      return;
    }

    const node = stateRef.current.nodes[id];
    setState((current) => ({ ...current, selectedId: id }));
    if (!node || !isExpandableKind(node.kind)) {
      return;
    }

    if (node.expanded) {
      collapse(id);
      return;
    }

    void expand(id).catch(() => undefined);
  }

  async function startCreate(kind: "file" | "dir", targetPath?: string) {
    const selectedId = targetPath ?? stateRef.current.selectedId;
    if (selectedId == null) {
      return;
    }

    const selected = stateRef.current.nodes[selectedId];
    if (!selected) {
      return;
    }

    const parentPath = isExpandableKind(selected.kind)
      ? selected.path
      : parentWindowsPath(selected.path);
    const parent = stateRef.current.nodes[parentPath];
    if (parent && !parent.expanded && isExpandableKind(parent.kind)) {
      await expand(parentPath);
    }

    setState((current) => ({
      ...current,
      create: { parentPath, kind, error: null },
    }));
  }

  function cancelCreate() {
    committingRef.current = false;
    setState((current) => ({ ...current, create: null }));
  }

  async function commitCreate(name: string) {
    const draft = stateRef.current.create;
    if (!draft || committingRef.current) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      cancelCreate();
      return;
    }

    committingRef.current = true;
    const path = joinWindowsPath(draft.parentPath, trimmed);
    try {
      if (draft.kind === "dir") {
        await createDir(path);
      } else {
        await createFile(path);
      }
      await reloadDir(draft.parentPath);
      setState((current) => ({ ...current, create: null }));
    } catch (error) {
      setState((current) =>
        current.create
          ? { ...current, create: { ...current.create, error: formatIpcError(error) } }
          : current,
      );
    } finally {
      committingRef.current = false;
    }
  }

  function collapseAll() {
    const expanded = Object.values(stateRef.current.nodes).filter((node) => node.expanded);
    setState((current) => ({
      ...current,
      create: null,
      nodes: Object.fromEntries(
        Object.entries(current.nodes).map(([path, node]) => [path, { ...node, expanded: false }]),
      ),
    }));
    for (const node of expanded) {
      void unwatchDir(node.path).catch(() => undefined);
    }
  }

  async function refreshPath(path: string) {
    const node = stateRef.current.nodes[path];
    if (!node) {
      return;
    }
    const target = isExpandableKind(node.kind) ? path : parentWindowsPath(path);
    const targetNode = stateRef.current.nodes[target];
    if (!targetNode || !isExpandableKind(targetNode.kind)) {
      return;
    }
    try {
      if (targetNode.expanded) {
        await reloadDir(target);
        return;
      }
      await expand(target);
    } catch {
      // Keep the last listing.
    }
  }

  /**
   * Applies the Assistant's `reveal_in_files` ui-action: selects the node if
   * it exists, expanding it first when it is a collapsed folder/drive. A
   * missing path is a silent no-op (the tree just doesn't move).
   */
  function revealPath(path: string) {
    const node = stateRef.current.nodes[path];
    if (!node) {
      return;
    }
    setState((current) => ({ ...current, selectedId: path }));
    if (isExpandableKind(node.kind) && !node.expanded) {
      void expand(path).catch(() => undefined);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const expandedPaths = Object.values(stateRef.current.nodes)
        .filter((node) => node.expanded)
        .map((node) => node.path);
      const drives = await listDrives();
      setState((current) => applyDrives(current, drives));
      await Promise.all(
        expandedPaths.map(async (path) => {
          const result = await listDir(path);
          setState((current) => applyListing(current, path, result.entries, true));
        }),
      );
    } catch {
      // Keep the last successful tree.
    } finally {
      setRefreshing(false);
    }
  }

  return {
    rows: flattenRows(state),
    nodes: state.nodes,
    selectedId: state.selectedId,
    create: state.create,
    refreshing,
    onSelect,
    onToggle,
    startCreate,
    commitCreate,
    cancelCreate,
    collapseAll,
    refresh,
    refreshPath,
    revealPath,
  };
}

export type FileTreeApi = ReturnType<typeof useFileTree>;

const FileTreeContext = React.createContext<FileTreeApi | null>(null);

/**
 * Owns the single `useFileTree()` instance shared by `<FileTree />` and the
 * Assistant, so a `reveal_in_files` ui-action mutates the same tree the user
 * sees instead of a disconnected copy.
 */
export function FileTreeProvider({ children }: { children: React.ReactNode }) {
  const tree = useFileTree();
  return React.createElement(FileTreeContext.Provider, { value: tree }, children);
}

/** Throws outside a `<FileTreeProvider>`; used by `<FileTree />` itself, which always has one. */
export function useFileTreeContext(): FileTreeApi {
  const context = React.useContext(FileTreeContext);
  if (!context) {
    throw new Error("useFileTreeContext must be used inside a <FileTreeProvider>");
  }
  return context;
}

/** Non-throwing accessor for the Assistant, which may render outside a `<FileTreeProvider>` in isolated specs. */
export function useFileTreeApiOptional(): FileTreeApi | null {
  return React.useContext(FileTreeContext);
}

/**
 * Test-only stub so specs can supply a fake `FileTreeApi` without mounting the
 * real `useFileTree()` (which calls `listDrives`/`listDir`/`watchDir` over IPC
 * on mount).
 */
export function FileTreeApiStubProvider({
  value,
  children,
}: {
  value: FileTreeApi;
  children: React.ReactNode;
}) {
  return React.createElement(FileTreeContext.Provider, { value }, children);
}
