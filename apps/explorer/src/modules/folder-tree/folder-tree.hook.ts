import type { TreeRow } from "@gencore/ui-kit";
import * as React from "react";
import { listDir, listDrives, subscribeFsChanges, unwatchDir, watchDir } from "../ipc/ipc.fs";
import type { DriveEntry, FsEntry } from "../ipc/ipc.types";
import { toBreadcrumbs } from "../navigation/navigation.path";
import type { FolderTreeNode } from "./folder-tree.types";

interface FolderTreeState {
  readonly roots: readonly string[];
  readonly nodes: Record<string, FolderTreeNode>;
}

const INITIAL_STATE: FolderTreeState = { roots: [], nodes: {} };

function driveToNode(drive: DriveEntry, existing?: FolderTreeNode): FolderTreeNode {
  return {
    name: drive.name,
    path: drive.path,
    kind: "drive",
    label: drive.label,
    expanded: existing?.expanded ?? false,
    children: existing?.children ?? [],
  };
}

function entryToNode(entry: FsEntry, existing?: FolderTreeNode): FolderTreeNode {
  return {
    name: entry.name,
    path: entry.path,
    kind: "dir",
    label: null,
    expanded: existing?.expanded ?? false,
    children: existing?.children ?? [],
  };
}

function applyDrives(state: FolderTreeState, drives: readonly DriveEntry[]): FolderTreeState {
  const nodes = { ...state.nodes };
  for (const drive of drives) {
    nodes[drive.path] = driveToNode(drive, nodes[drive.path]);
  }
  return { roots: drives.map((drive) => drive.path), nodes };
}

function applyListing(
  state: FolderTreeState,
  parentPath: string,
  entries: readonly FsEntry[],
  expanded = true,
): FolderTreeState {
  const parent = state.nodes[parentPath];
  if (!parent) {
    return state;
  }

  const dirs = entries.filter((entry) => entry.kind === "dir");
  const nodes = { ...state.nodes };
  const children = dirs.map((entry) => entry.path);
  for (const entry of dirs) {
    nodes[entry.path] = entryToNode(entry, nodes[entry.path]);
  }
  nodes[parentPath] = { ...parent, children, expanded };
  return { ...state, nodes };
}

function flattenRows(state: FolderTreeState, selectedPath: string): TreeRow[] {
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
      expandable: true,
      expanded: node.expanded,
      selected: node.path === selectedPath,
    });
    if (!node.expanded) {
      return;
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

export function useFolderTree(currentPath: string, onNavigate: (path: string) => void) {
  const [state, setState] = React.useState<FolderTreeState>(INITIAL_STATE);
  const stateRef = React.useRef(state);
  stateRef.current = state;

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
      return { ...current, nodes: { ...current.nodes, [path]: { ...node, expanded: false } } };
    });
    void unwatchDir(path).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void listDrives()
      .then((drives) => {
        if (!cancelled) {
          setState((current) => applyDrives(current, drives));
        }
      })
      .catch(() => undefined);

    void subscribeFsChanges((payload) => {
      const parent = stateRef.current.nodes[payload.parent];
      if (!parent?.expanded) {
        return;
      }
      void listDir(payload.parent)
        .then((result) => {
          setState((current) => applyListing(current, payload.parent, result.entries, true));
        })
        .catch(() => undefined);
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
  }, []);

  React.useEffect(() => {
    if (!currentPath) {
      return;
    }
    let cancelled = false;

    async function reveal() {
      const ancestors = toBreadcrumbs(currentPath).map((segment) => segment.path);
      for (const ancestorPath of ancestors) {
        if (cancelled) {
          return;
        }
        const node = stateRef.current.nodes[ancestorPath];
        if (node && !node.expanded) {
          await expand(ancestorPath).catch(() => undefined);
        }
      }
    }

    void reveal();
    return () => {
      cancelled = true;
    };
  }, [currentPath, expand]);

  function onSelect(id: string) {
    onNavigate(id);
  }

  function onToggle(id: string) {
    const node = stateRef.current.nodes[id];
    if (!node) {
      return;
    }
    if (node.expanded) {
      collapse(id);
    } else {
      void expand(id).catch(() => undefined);
    }
    onNavigate(id);
  }

  return {
    rows: flattenRows(state, currentPath),
    onSelect,
    onToggle,
  };
}
