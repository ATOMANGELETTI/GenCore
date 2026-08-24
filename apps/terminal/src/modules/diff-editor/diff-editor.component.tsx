import {
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gencore/ui-kit";
import { DiffEditor, loader } from "@monaco-editor/react";
import {
  Columns2,
  FileCode,
  FoldHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Terminal,
  X,
} from "lucide-react";
import * as monaco from "monaco-editor";
import * as React from "react";
import { gitDiscardChanges, gitGetDiff, gitStageFile } from "../ipc/ipc.git";
import { NORD_DARK_THEME, NORD_LIGHT_THEME, registerNordMonacoThemes } from "./diff-editor.theme";
import type { DiffEditorProps, DiffEditorViewMode } from "./diff-editor.types";

// Configure local Monaco instance so CSP blocks external CDN fetching
loader.config({ monaco });

function getLanguageFromExtension(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "ts":
    case "tsx":
    case "mts":
      return "typescript";
    case "js":
    case "jsx":
    case "mjs":
      return "javascript";
    case "rs":
      return "rust";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
    case "htm":
      return "html";
    case "md":
    case "markdown":
      return "markdown";
    case "toml":
      return "ini";
    case "yaml":
    case "yml":
      return "yaml";
    case "sh":
    case "bash":
    case "ps1":
      return "shell";
    default:
      return "plaintext";
  }
}

export function DiffEditorView({
  filePath,
  repoPath,
  theme = "polar-night",
  original: propOriginal,
  modified: propModified,
  onStage,
  onDiscard,
  onOpenMicro,
  onClose,
}: DiffEditorProps) {
  const [viewMode, setViewMode] = React.useState<DiffEditorViewMode>("inline");
  const [original, setOriginal] = React.useState<string>(propOriginal ?? "");
  const [modified, setModified] = React.useState<string>(propModified ?? "");
  const [loading, setLoading] = React.useState<boolean>(!propOriginal && !propModified);
  const [error, setError] = React.useState<string | null>(null);

  const isDark = theme !== "snow-storm";
  const monacoTheme = isDark ? NORD_DARK_THEME : NORD_LIGHT_THEME;
  const language = React.useMemo(() => getLanguageFromExtension(filePath), [filePath]);

  const loadDiff = React.useCallback(async () => {
    if (!repoPath || !filePath) return;
    try {
      setLoading(true);
      setError(null);
      const res = await gitGetDiff(repoPath, filePath);
      setOriginal(res.head_content);
      setModified(res.working_content);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [repoPath, filePath]);

  React.useEffect(() => {
    if (propOriginal === undefined && propModified === undefined) {
      void loadDiff();
    }
  }, [propOriginal, propModified, loadDiff]);

  async function handleStage() {
    try {
      await gitStageFile(repoPath, filePath);
      onStage?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDiscard() {
    try {
      await gitDiscardChanges(repoPath, filePath);
      onDiscard?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div
      data-slot="diff-editor-view"
      className="flex h-full min-h-0 w-full flex-col bg-background text-foreground"
    >
      {/* Top Diff Header Toolbar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-card px-3 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="text-xs font-mono font-medium truncate" title={filePath}>
            {filePath}
          </span>
          <span
            data-testid="diff-editor-theme"
            data-theme={monacoTheme}
            className="hidden"
            aria-hidden="true"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {/* View Mode Toggle: Inline vs Split */}
          <div className="flex items-center rounded-sm border border-border bg-background p-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={viewMode === "inline" ? "secondary" : "ghost"}
                    size="icon-xs"
                    aria-label="Inline diff view"
                    className={cn(
                      "h-5 w-5 rounded-xs p-0 text-xs",
                      viewMode === "inline" && "bg-accent text-accent-foreground",
                    )}
                    onClick={() => setViewMode("inline")}
                  >
                    <FoldHorizontal className="size-3" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Unified (Inline) Diff</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={viewMode === "split" ? "secondary" : "ghost"}
                    size="icon-xs"
                    aria-label="Split diff view"
                    className={cn(
                      "h-5 w-5 rounded-xs p-0 text-xs",
                      viewMode === "split" && "bg-accent text-accent-foreground",
                    )}
                    onClick={() => setViewMode("split")}
                  >
                    <Columns2 className="size-3" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Side-by-Side (Split) Diff</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Action Buttons: Stage, Discard, Edit in Micro */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Stage file changes"
                  onClick={handleStage}
                >
                  <Plus className="size-3.5 text-success" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stage File</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Discard file changes"
                  onClick={handleDiscard}
                >
                  <RotateCcw className="size-3.5 text-destructive" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Discard Changes</TooltipContent>
            </Tooltip>

            {onOpenMicro ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Edit in Micro"
                    onClick={() => onOpenMicro(filePath)}
                  >
                    <Terminal className="size-3.5 text-primary" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open in Micro Editor (TUI)</TooltipContent>
              </Tooltip>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Refresh diff"
                  onClick={() => void loadDiff()}
                >
                  <RefreshCw
                    className={cn("size-3.5", loading && "animate-spin")}
                    aria-hidden="true"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Diff</TooltipContent>
            </Tooltip>

            {onClose ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Close diff view"
                    onClick={onClose}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close Diff</TooltipContent>
              </Tooltip>
            ) : null}
          </TooltipProvider>
        </div>
      </div>

      {/* Editor Body */}
      <div className="min-h-0 flex-1 relative">
        {error ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-destructive">
            Failed to load diff: {error}
          </div>
        ) : (
          <DiffEditor
            height="100%"
            language={language}
            original={original}
            modified={modified}
            theme={monacoTheme}
            beforeMount={(monacoInstance) => {
              registerNordMonacoThemes(monacoInstance);
            }}
            options={{
              renderSideBySide: viewMode === "split",
              readOnly: true,
              fontFamily: "Terminess Nerd Font, monospace",
              fontSize: 12,
              lineHeight: 18,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              minimap: { enabled: false },
              renderIndicators: true,
              originalEditable: false,
              diffCodeLens: true,
            }}
          />
        )}
      </div>
    </div>
  );
}
