export type SidePanelTabId = "tree" | "details" | "config";

export interface SidePanelProps {
  open?: boolean;
  readonly currentPath: string;
  readonly selectedPaths: ReadonlySet<string>;
  onNavigate: (path: string) => void;
}
