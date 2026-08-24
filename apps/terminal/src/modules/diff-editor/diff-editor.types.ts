export type DiffEditorViewMode = "inline" | "split";

export interface DiffEditorProps {
  filePath: string;
  repoPath: string;
  theme?: "polar-night" | "snow-storm";
  original?: string;
  modified?: string;
  onStage?: () => void;
  onDiscard?: () => void;
  onOpenMicro?: (filePath: string) => void;
  onClose?: () => void;
}
