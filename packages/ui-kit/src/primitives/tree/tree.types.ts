import type * as React from "react";

export interface TreeRow {
  id: string;
  depth: number;
  name: string;
  expandable: boolean;
  expanded: boolean;
  selected: boolean;
  muted?: boolean;
  /** When set, the row does not clip descendants (inline create errors). */
  overflowVisible?: boolean;
}

export interface TreeProps {
  rows: TreeRow[];
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  renderLeading?: (row: TreeRow) => React.ReactNode;
  renderName?: (row: TreeRow) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
