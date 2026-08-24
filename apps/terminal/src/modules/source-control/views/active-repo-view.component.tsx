import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FileIcon,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gencore/ui-kit";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  GitBranchPlus,
  GitCommit,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import * as React from "react";
import { useTerminalSessionOptional } from "../../terminal/terminal.hook";
import { useSourceControlContext } from "../source-control.hook";

function statusBadge(status: string) {
  switch (status) {
    case "added":
    case "A":
      return <span className="font-mono text-[10px] font-bold text-success">A</span>;
    case "modified":
    case "M":
      return <span className="font-mono text-[10px] font-bold text-warning">M</span>;
    case "deleted":
    case "D":
      return <span className="font-mono text-[10px] font-bold text-destructive">D</span>;
    case "renamed":
    case "R":
      return <span className="font-mono text-[10px] font-bold text-primary">R</span>;
    case "untracked":
    case "U":
      return <span className="font-mono text-[10px] font-bold text-success">U</span>;
    case "conflict":
    case "!":
      return <span className="font-mono text-[10px] font-bold text-destructive">!</span>;
    default:
      return <span className="font-mono text-[10px] font-bold text-muted-foreground">M</span>;
  }
}

export function ActiveRepoView() {
  const {
    folderPath,
    branch,
    branches,
    stagedFiles,
    unstagedFiles,
    untrackedFiles,
    ahead,
    behind,
    commits,
    refreshing,
    refresh,
    stageFile,
    unstageFile,
    stageAll,
    unstageAll,
    discardChanges,
    commit,
    checkoutBranch,
    createBranch,
  } = useSourceControlContext();

  const terminal = useTerminalSessionOptional();

  const [message, setMessage] = React.useState("");
  const [amend, setAmend] = React.useState(false);
  const [stagedOpen, setStagedOpen] = React.useState(true);
  const [unstagedOpen, setUnstagedOpen] = React.useState(true);
  const [untrackedOpen, setUntrackedOpen] = React.useState(true);
  const [graphOpen, setGraphOpen] = React.useState(false);
  const [newBranchInput, setNewBranchInput] = React.useState<string | null>(null);

  const totalChanges = stagedFiles.length + unstagedFiles.length + untrackedFiles.length;
  const canCommit =
    message.trim().length > 0 && (stagedFiles.length > 0 || (amend && totalChanges === 0));

  async function handleCommit() {
    if (!canCommit) return;
    await commit(message.trim(), amend);
    setMessage("");
    setAmend(false);
  }

  function generateAiCommitMessage() {
    const allPaths: string[] = [
      ...stagedFiles.map((f) => f.path),
      ...unstagedFiles.map((f) => f.path),
      ...untrackedFiles,
    ];
    if (allPaths.length === 0) return;

    const fileNames = allPaths.map((p) => p.split(/[/\\]/).pop() || p);
    const primaryName = fileNames[0] || "files";
    const baseSummary =
      stagedFiles.some((f) => f.status === "added") || untrackedFiles.length > 0
        ? `feat: add ${primaryName}`
        : `fix: update ${primaryName}`;

    setMessage(baseSummary);
  }

  function handleFileClick(filePath: string) {
    if (!folderPath) return;
    const fullPath =
      folderPath.endsWith("\\") || folderPath.endsWith("/")
        ? `${folderPath}${filePath}`
        : `${folderPath}\\${filePath}`;
    terminal?.openEditorTab(fullPath, `Diff: ${filePath.split(/[/\\]/).pop() || filePath}`);
  }

  return (
    <div data-slot="active-repo-view" className="flex h-full min-h-0 flex-col bg-card select-none">
      {/* Branch Header & Sync Chip */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1.5 px-1.5 text-xs font-medium text-foreground hover:bg-accent/60"
            >
              <GitBranch className="size-3.5 text-primary" aria-hidden="true" />
              <span className="truncate max-w-[140px]">{branch ?? "detached"}</span>
              <ChevronDown className="size-3 text-muted-foreground" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Switch Branch
            </div>
            {branches.map((b) => (
              <DropdownMenuItem
                key={b.name}
                className="flex items-center justify-between text-xs"
                onClick={() => {
                  void checkoutBranch(b.name);
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <GitBranch className="size-3.5" aria-hidden="true" />
                  <span className="truncate">{b.name}</span>
                </span>
                {b.is_current ? (
                  <Check className="size-3.5 text-primary" aria-hidden="true" />
                ) : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 text-xs"
              onClick={() => {
                setNewBranchInput("");
              }}
            >
              <GitBranchPlus className="size-3.5 text-primary" aria-hidden="true" />
              <span>Create New Branch...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          {ahead > 0 ? (
            <span
              className="flex items-center text-[10px] text-primary font-mono"
              title={`${ahead} commit(s) ahead`}
            >
              <ArrowUp className="size-3" />
              {ahead}
            </span>
          ) : null}
          {behind > 0 ? (
            <span
              className="flex items-center text-[10px] text-warning font-mono"
              title={`${behind} commit(s) behind`}
            >
              <ArrowDown className="size-3" />
              {behind}
            </span>
          ) : null}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Refresh repository"
                  onClick={() => {
                    void refresh();
                  }}
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5",
                      refreshing && "animate-spin motion-reduce:animate-none",
                    )}
                    aria-hidden="true"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Repository</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* New Branch Inline Input (if active) */}
      {newBranchInput !== null ? (
        <div className="p-2 border-b border-border bg-accent/20">
          <Input
            autoFocus
            placeholder="Branch name (Enter to create, Esc to cancel)"
            value={newBranchInput}
            onChange={(e) => setNewBranchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newBranchInput.trim()) {
                void createBranch(newBranchInput.trim());
                setNewBranchInput(null);
              } else if (e.key === "Escape") {
                setNewBranchInput(null);
              }
            }}
            className="h-6 text-xs"
          />
        </div>
      ) : null}

      {/* Commit Box */}
      <div className="p-2 border-b border-border flex flex-col gap-1.5 shrink-0">
        <div className="relative">
          <textarea
            rows={2}
            placeholder="Message (Ctrl+Enter to commit)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                void handleCommit();
              }
            }}
            className="w-full resize-none rounded-md border border-input bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-sans"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!canCommit}
            className="flex-1 h-7 text-xs gap-1.5"
            onClick={() => {
              void handleCommit();
            }}
          >
            <GitCommit className="size-3.5" aria-hidden="true" />
            <span>Commit</span>
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Generate AI Commit Message"
                  onClick={generateAiCommitMessage}
                  className="h-7 w-7 text-primary hover:bg-accent/40"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate AI Commit Message</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Scrollable File Changes List */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {/* Staged Changes Accordion */}
        {stagedFiles.length > 0 ? (
          <div className="border-b border-border/40">
            <div className="flex h-6 items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
              <button
                type="button"
                className="flex flex-1 items-center gap-1 text-left hover:text-foreground cursor-pointer bg-transparent border-0 p-0"
                onClick={() => setStagedOpen(!stagedOpen)}
              >
                {stagedOpen ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                <span className="uppercase text-[10px] tracking-wide">Staged Changes</span>
                <span className="ml-1 rounded-full bg-accent px-1.5 text-[9px] font-bold text-foreground">
                  {stagedFiles.length}
                </span>
              </button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Unstage all"
                      onClick={(e) => {
                        e.stopPropagation();
                        void unstageAll();
                      }}
                    >
                      <Minus className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Unstage All Changes</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {stagedOpen ? (
              <div className="py-0.5">
                {stagedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="group flex h-6 items-center justify-between px-2 text-xs hover:bg-accent/40"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-1.5 truncate flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
                      onClick={() => handleFileClick(file.path)}
                    >
                      <FileIcon
                        nodeKind="file"
                        className="size-3.5 text-muted-foreground shrink-0"
                      />
                      <span className="truncate text-foreground text-[11px]">{file.path}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {statusBadge(file.status)}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Unstage ${file.path}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          void unstageFile(file.path);
                        }}
                      >
                        <Minus className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Working / Unstaged Changes Accordion */}
        {unstagedFiles.length > 0 ? (
          <div className="border-b border-border/40">
            <div className="flex h-6 items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
              <button
                type="button"
                className="flex flex-1 items-center gap-1 text-left hover:text-foreground cursor-pointer bg-transparent border-0 p-0"
                onClick={() => setUnstagedOpen(!unstagedOpen)}
              >
                {unstagedOpen ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                <span className="uppercase text-[10px] tracking-wide">Changes</span>
                <span className="ml-1 rounded-full bg-accent px-1.5 text-[9px] font-bold text-foreground">
                  {unstagedFiles.length}
                </span>
              </button>
              <div className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Discard all changes"
                        onClick={(e) => {
                          e.stopPropagation();
                          void discardChanges();
                        }}
                      >
                        <RotateCcw className="size-3 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Discard All Changes</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Stage all changes"
                        onClick={(e) => {
                          e.stopPropagation();
                          void stageAll();
                        }}
                      >
                        <Plus className="size-3 text-success" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Stage All Changes</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {unstagedOpen ? (
              <div className="py-0.5">
                {unstagedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="group flex h-6 items-center justify-between px-2 text-xs hover:bg-accent/40"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-1.5 truncate flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
                      onClick={() => handleFileClick(file.path)}
                    >
                      <FileIcon
                        nodeKind="file"
                        className="size-3.5 text-muted-foreground shrink-0"
                      />
                      <span className="truncate text-foreground text-[11px]">{file.path}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {statusBadge(file.status)}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Discard ${file.path}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          void discardChanges(file.path);
                        }}
                      >
                        <RotateCcw className="size-3 text-destructive" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Stage ${file.path}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          void stageFile(file.path);
                        }}
                      >
                        <Plus className="size-3 text-success" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Untracked Changes Accordion */}
        {untrackedFiles.length > 0 ? (
          <div className="border-b border-border/40">
            <div className="flex h-6 items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
              <button
                type="button"
                className="flex flex-1 items-center gap-1 text-left hover:text-foreground cursor-pointer bg-transparent border-0 p-0"
                onClick={() => setUntrackedOpen(!untrackedOpen)}
              >
                {untrackedOpen ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                <span className="uppercase text-[10px] tracking-wide">Untracked</span>
                <span className="ml-1 rounded-full bg-accent px-1.5 text-[9px] font-bold text-foreground">
                  {untrackedFiles.length}
                </span>
              </button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Stage untracked changes"
                      onClick={(e) => {
                        e.stopPropagation();
                        void stageAll();
                      }}
                    >
                      <Plus className="size-3 text-success" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Stage Untracked Changes</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {untrackedOpen ? (
              <div className="py-0.5">
                {untrackedFiles.map((filePath) => (
                  <div
                    key={filePath}
                    className="group flex h-6 items-center justify-between px-2 text-xs hover:bg-accent/40"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-1.5 truncate flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
                      onClick={() => handleFileClick(filePath)}
                    >
                      <FileIcon
                        nodeKind="file"
                        className="size-3.5 text-muted-foreground shrink-0"
                      />
                      <span className="truncate text-foreground text-[11px]">{filePath}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {statusBadge("untracked")}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Stage ${filePath}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          void stageFile(filePath);
                        }}
                      >
                        <Plus className="size-3 text-success" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {totalChanges === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No working changes. Working tree clean.
          </div>
        ) : null}

        {/* Git Graph & Commit History Section (Task 7) */}
        {commits.length > 0 ? (
          <div className="border-t border-border/50 mt-2">
            <button
              type="button"
              className="flex h-6 w-full cursor-pointer items-center justify-between px-2 hover:bg-accent/30 text-xs font-semibold text-muted-foreground bg-transparent border-0 text-left"
              onClick={() => setGraphOpen(!graphOpen)}
            >
              <div className="flex items-center gap-1">
                {graphOpen ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                <span className="uppercase text-[10px] tracking-wide">
                  Git History ({commits.length})
                </span>
              </div>
            </button>
            {graphOpen ? (
              <div className="divide-y divide-border/20 py-1">
                {commits.map((c) => (
                  <div key={c.id} className="p-2 text-xs hover:bg-accent/20">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-[10px] text-primary font-semibold">
                        {c.short_id}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{c.author_name}</span>
                    </div>
                    <p className="text-[11px] text-foreground font-medium line-clamp-1">
                      {c.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
