import {
  Button,
  ContextMenu,
  ContextMenuTrigger,
  cn,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTheme,
} from "@gencore/ui-kit";
import { Pin, Plus, X } from "lucide-react";
import * as React from "react";
import { TabContextMenu } from "../context-menu/context-menu.terminal";
import { autoTitle, clampPtyDim, seamLine, useTerminalSession } from "./terminal.hook";
import { nordXtermTheme } from "./terminal.theme";
import type { TerminalTab } from "./terminal.types";
import { createXterm, restoreSerializedBuffer, type XtermHost } from "./terminal.xterm";

export function TerminalView() {
  const session = useTerminalSession();
  const { theme } = useTheme();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const hostsRef = React.useRef(new Map<string, XtermHost>());
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const stripRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    return session.registerClipboard({
      hasSelection: () => hostsRef.current.get(session.activeId)?.terminal.hasSelection() ?? false,
      copy: async () => {
        const text = hostsRef.current.get(session.activeId)?.terminal.getSelection() ?? "";
        if (!text || !navigator.clipboard?.writeText) {
          return;
        }
        await navigator.clipboard.writeText(text);
      },
      paste: async () => {
        if (!navigator.clipboard?.readText) {
          return;
        }
        const text = await navigator.clipboard.readText();
        const terminal = hostsRef.current.get(session.activeId)?.terminal;
        if (text && terminal) {
          terminal.paste(text);
        }
      },
      selectAll: () => {
        hostsRef.current.get(session.activeId)?.terminal.selectAll();
      },
    });
  }, [session.activeId, session.registerClipboard]);

  const fitActive = React.useCallback(() => {
    for (const [id, host] of hostsRef.current) {
      try {
        host.fit.fit();
      } catch {
        // Container may not be measurable yet.
      }
      if (id === session.activeId) {
        session.setViewport(clampPtyDim(host.terminal.cols), clampPtyDim(host.terminal.rows));
      }
    }
  }, [session]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      fitActive();
    });
    observer.observe(viewport);
    fitActive();
    return () => observer.disconnect();
  }, [fitActive]);

  React.useEffect(() => {
    for (const host of hostsRef.current.values()) {
      host.terminal.options.theme = nordXtermTheme(theme);
    }
  }, [theme]);

  React.useEffect(() => {
    hostsRef.current.get(session.activeId)?.terminal.focus();
    const frame = requestAnimationFrame(() => {
      fitActive();
    });
    return () => cancelAnimationFrame(frame);
  }, [fitActive, session.activeId]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      if (event.key === "t" || event.key === "T") {
        if (event.shiftKey) {
          return;
        }
        event.preventDefault();
        session.newTab();
        return;
      }
      if (event.key === "w" || event.key === "W") {
        if (event.shiftKey) {
          return;
        }
        event.preventDefault();
        session.closeTab(session.activeId);
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        const ordered = session.tabs;
        const index = ordered.findIndex((tab) => tab.id === session.activeId);
        if (index < 0 || ordered.length === 0) {
          return;
        }
        const delta = event.shiftKey ? -1 : 1;
        const next = ordered[(index + delta + ordered.length) % ordered.length];
        if (next) {
          session.setActive(next.id);
        }
        return;
      }
      if (event.shiftKey) {
        return;
      }
      if (event.key >= "1" && event.key <= "9") {
        event.preventDefault();
        const ordered = session.tabs;
        const tab =
          event.key === "9" ? ordered[ordered.length - 1] : ordered[Number(event.key) - 1];
        if (tab) {
          session.setActive(tab.id);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session]);

  React.useEffect(() => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const stop = (event: Event) => {
      event.stopPropagation();
    };
    strip.addEventListener("contextmenu", stop);
    return () => strip.removeEventListener("contextmenu", stop);
  }, []);

  function registerHost(tabId: string, host: XtermHost | null) {
    if (host) {
      hostsRef.current.set(tabId, host);
      return;
    }
    hostsRef.current.delete(tabId);
  }

  return (
    <TooltipProvider>
      <div data-slot="terminal-view" className="flex h-full min-h-0 flex-col">
        <div
          ref={stripRef}
          className="flex h-7 shrink-0 items-center gap-1 border-b border-border bg-card px-1 select-none"
        >
          <div
            role="tablist"
            aria-label="Terminal sessions"
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          >
            {session.tabs.map((tab) => (
              <TerminalTabPill
                key={tab.id}
                tab={tab}
                active={tab.id === session.activeId}
                editing={tab.id === editingId}
                onSelect={() => session.setActive(tab.id)}
                onClose={() => session.closeTab(tab.id)}
                onStartRename={() => setEditingId(tab.id)}
                onCommitRename={(name) => {
                  session.renameTab(tab.id, name);
                  setEditingId(null);
                }}
                onCancelRename={() => setEditingId(null)}
                onTogglePin={() => session.togglePin(tab.id)}
                onCloseOthers={() => session.closeOthers(tab.id)}
                onCloseUnpinned={() => session.closeUnpinned()}
              />
            ))}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="New tab"
                onClick={() => session.newTab()}
              >
                <Plus aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New tab</TooltipContent>
          </Tooltip>
        </div>

        <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden">
          {session.tabs.map((tab) => (
            <TerminalHostPane
              key={tab.id}
              tab={tab}
              active={tab.id === session.activeId}
              onRestart={() => session.restartTab(tab.id)}
              onRegister={registerHost}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function TerminalHostPane({
  tab,
  active,
  onRestart,
  onRegister,
}: {
  tab: TerminalTab;
  active: boolean;
  onRestart: () => void;
  onRegister: (tabId: string, host: XtermHost | null) => void;
}) {
  const session = useTerminalSession();
  const { theme } = useTheme();
  const nodeRef = React.useRef<HTMLDivElement | null>(null);
  const sessionRef = React.useRef(session);
  const themeRef = React.useRef(theme);
  const onRegisterRef = React.useRef(onRegister);
  const activeRef = React.useRef(active);
  const restoreRef = React.useRef(tab.restore);
  sessionRef.current = session;
  themeRef.current = theme;
  onRegisterRef.current = onRegister;
  activeRef.current = active;
  restoreRef.current = tab.restore;

  React.useEffect(() => {
    const node = nodeRef.current;
    if (!node) {
      return;
    }
    const host = createXterm(node, themeRef.current);
    const restore = restoreRef.current;
    if (restore) {
      restoreSerializedBuffer(host.terminal, restore.scrollback, seamLine(restore.cols));
    }
    onRegisterRef.current(tab.id, host);
    const unreg = sessionRef.current.registerWriter(tab.id, (data) => {
      host.terminal.write(data);
    });
    const unregSerialize = sessionRef.current.registerSerializer(tab.id, () =>
      host.serialize.serialize(),
    );
    const dataSub = host.terminal.onData((data) => {
      sessionRef.current.onTerminalInput(tab.id, data);
    });
    host.terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") {
        return true;
      }
      if (event.ctrlKey && event.shiftKey && (event.key === "C" || event.key === "c")) {
        event.preventDefault();
        const text = host.terminal.getSelection();
        if (text) {
          void navigator.clipboard?.writeText(text);
        }
        return false;
      }
      if (event.ctrlKey && event.shiftKey && (event.key === "V" || event.key === "v")) {
        event.preventDefault();
        void navigator.clipboard?.readText().then((text) => {
          if (text) {
            host.terminal.paste(text);
          }
        });
        return false;
      }
      if (
        event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        (event.key === "t" ||
          event.key === "T" ||
          event.key === "w" ||
          event.key === "W" ||
          event.key === "Tab" ||
          (event.key >= "1" && event.key <= "9"))
      ) {
        return false;
      }
      return true;
    });
    requestAnimationFrame(() => {
      try {
        host.fit.fit();
      } catch {
        // Ignore until laid out.
      }
      if (activeRef.current) {
        sessionRef.current.setViewport(
          clampPtyDim(host.terminal.cols),
          clampPtyDim(host.terminal.rows),
        );
        host.terminal.focus();
      }
    });
    return () => {
      unreg();
      unregSerialize();
      dataSub.dispose();
      onRegisterRef.current(tab.id, null);
      host.dispose();
    };
  }, [tab.id]);

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col",
        active ? undefined : "pointer-events-none invisible",
      )}
      aria-hidden={!active}
    >
      {tab.status === "exited" ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-2 py-1 text-xs text-muted-foreground">
          <span>Exited</span>
          <Button variant="ghost" size="sm" onClick={onRestart}>
            Restart
          </Button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 p-3">
        <div ref={nodeRef} className="h-full w-full overflow-hidden" />
      </div>
    </div>
  );
}

function TerminalTabPill({
  tab,
  active,
  editing,
  onSelect,
  onClose,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onTogglePin,
  onCloseOthers,
  onCloseUnpinned,
}: {
  tab: TerminalTab;
  active: boolean;
  editing: boolean;
  onSelect: () => void;
  onClose: () => void;
  onStartRename: () => void;
  onCommitRename: (name: string | null) => void;
  onCancelRename: () => void;
  onTogglePin: () => void;
  onCloseOthers: () => void;
  onCloseUnpinned: () => void;
}) {
  const title = autoTitle(tab.name, tab.cwd);

  if (editing) {
    return (
      <RenameField
        initial={tab.name ?? title}
        onCommit={onCommitRename}
        onCancel={onCancelRename}
      />
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="tab"
          tabIndex={active ? 0 : -1}
          aria-selected={active}
          aria-label={title}
          className={cn(
            "group inline-flex h-[22px] max-w-[16rem] shrink-0 cursor-default items-center gap-1 rounded-[6px] px-2 text-xs select-none",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            active
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
          onClick={onSelect}
          onDoubleClick={(event) => {
            event.preventDefault();
            onStartRename();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect();
            }
          }}
          onMouseDown={(event) => {
            if (event.button === 1) {
              event.preventDefault();
            }
          }}
          onAuxClick={(event) => {
            if (event.button === 1) {
              event.preventDefault();
              onClose();
            }
          }}
        >
          {tab.pinned ? <Pin aria-hidden="true" className="size-3 fill-current" /> : null}
          <span className="truncate">{title}</span>
          {tab.status === "exited" ? (
            <span className="text-[10px] text-muted-foreground">Exited</span>
          ) : null}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Close ${title}`}
            className={cn(
              "shrink-0",
              active
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </ContextMenuTrigger>
      <TabContextMenu
        pinned={tab.pinned}
        onRename={onStartRename}
        onTogglePin={onTogglePin}
        onClose={onClose}
        onCloseOthers={onCloseOthers}
        onCloseUnpinned={onCloseUnpinned}
      />
    </ContextMenu>
  );
}

function RenameField({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (name: string | null) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = React.useState(initial);
  const doneRef = React.useRef(false);

  function finish(next: string | undefined) {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    if (next === undefined) {
      onCancel();
      return;
    }
    const trimmed = next.trim();
    onCommit(trimmed.length === 0 ? null : trimmed);
  }

  return (
    <Input
      autoFocus
      autoComplete="off"
      spellCheck={false}
      aria-label="Tab name"
      value={value}
      className="h-[22px] min-w-[8rem] max-w-[16rem] px-1 text-xs"
      onChange={(event) => {
        setValue(event.target.value);
      }}
      onBlur={() => {
        finish(value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finish(value);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          finish(undefined);
        }
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    />
  );
}
