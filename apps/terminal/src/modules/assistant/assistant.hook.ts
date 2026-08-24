import * as React from "react";
import {
  AgentSettingsContext,
  type AgentSettingsValue,
  useAgentSettings,
} from "../config/config.agent";
import { toFilesSelection, useFileTreeApiOptional } from "../file-tree/file-tree.hook";
import {
  cancelTurn,
  confirmAction,
  createConversation,
  listConversations,
  listMessages,
  rejectAction,
  sendMessage,
  subscribeAssistantError,
  subscribeAssistantToken,
  subscribeAssistantTurn,
  subscribeAssistantUiAction,
} from "../ipc/ipc.assistant";
import type {
  AssistantMessage,
  AssistantToolCall,
  AssistantUiActionPayload,
  Conversation,
} from "../ipc/ipc.types";
import { useTerminalSessionOptional } from "../terminal/terminal.hook";
import { buildSnapshot } from "./assistant.snapshot";
import type { AssistantApi, AssistantErrorInfo } from "./assistant.types";

export { useAgentSettings };

/** Composer draft key for the state before any conversation has been selected. */
const NEW_CHAT_COMPOSER_KEY = "";

import { readWorkspaceFolder } from "../files/files.storage";
import {
  gitCommit,
  gitCreateBranch,
  gitStageAll,
  gitStageFile,
  gitStashSave,
} from "../ipc/ipc.git";

/**
 * Applies a `gencore-assistant://ui-action` payload emitted after the user
 * confirms `switch_tab`, `reveal_in_files`, or Git tools. Unknown action names
 * and malformed args are silent no-ops; the tool already ran on the Rust side.
 */
export function applyAssistantUiAction(
  payload: AssistantUiActionPayload,
  handlers: {
    setActive?: (id: string) => void;
    revealPath?: (path: string) => void;
    onGitAction?: () => void;
  },
): void {
  const args = payload.args as Record<string, unknown> | null;
  if (payload.name === "switch_tab") {
    const tabId = typeof args?.tab_id === "string" ? args.tab_id : null;
    if (tabId) {
      handlers.setActive?.(tabId);
    }
    return;
  }
  if (payload.name === "reveal_in_files") {
    const path = typeof args?.path === "string" ? args.path : null;
    if (path) {
      handlers.revealPath?.(path);
    }
    return;
  }

  const folder = readWorkspaceFolder();
  if (!folder) return;

  if (payload.name === "git_stage") {
    if (typeof args?.path === "string") {
      void gitStageFile(folder, args.path).then(() => handlers.onGitAction?.());
    } else if (Array.isArray(args?.paths) && args.paths.length > 0) {
      void Promise.all(
        args.paths
          .filter((p): p is string => typeof p === "string")
          .map((p) => gitStageFile(folder, p)),
      ).then(() => handlers.onGitAction?.());
    } else {
      void gitStageAll(folder).then(() => handlers.onGitAction?.());
    }
    return;
  }
  if (payload.name === "git_commit") {
    const msg = typeof args?.message === "string" ? args.message : "Commit from assistant";
    void gitCommit(folder, msg).then(() => handlers.onGitAction?.());
    return;
  }
  if (payload.name === "git_create_branch") {
    const branch = typeof args?.branch === "string" ? args.branch : null;
    if (branch) {
      void gitCreateBranch(folder, branch).then(() => handlers.onGitAction?.());
    }
    return;
  }
  if (payload.name === "git_stash") {
    const msg = typeof args?.message === "string" ? args.message : undefined;
    void gitStashSave(folder, msg).then(() => handlers.onGitAction?.());
    return;
  }
}

/** Renders a caught IPC rejection (a plain string/Error, never `{ code, message }`) as an `AssistantErrorInfo`. */
function isStaleGeneration(
  current: Record<string, number>,
  conversationId: string,
  generation?: number,
): boolean {
  const active = current[conversationId];
  if (active === undefined || generation === undefined) {
    return false;
  }
  return generation !== active;
}

function describeCaughtError(err: unknown): AssistantErrorInfo {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
  return { code: "Error", message };
}

/**
 * Test-only stub for specs that only care about `hasApiKey`. Provides the
 * same context `useAgentSettings()` (from `config.agent.ts`) reads from, so
 * `useAssistant()` picks up the stubbed value without a real IPC-backed
 * `AgentSettingsProvider`.
 */
export function AgentSettingsStubProvider({
  hasApiKey = false,
  children,
}: {
  hasApiKey?: boolean;
  children: React.ReactNode;
}) {
  const value = React.useMemo<AgentSettingsValue>(
    () => ({
      model: "gemini-3.7-flash",
      contextLines: 80,
      hasApiKey,
      setModel: () => undefined,
      setContextLines: () => undefined,
      saveKey: async () => true,
      clearKey: async () => undefined,
      replaceKey: () => undefined,
    }),
    [hasApiKey],
  );
  return React.createElement(AgentSettingsContext.Provider, { value }, children);
}

export function useAssistant(): AssistantApi {
  const { hasApiKey, contextLines } = useAgentSettings();
  const terminalSession = useTerminalSessionOptional();
  const fileTreeApi = useFileTreeApiOptional();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messagesByConversation, setMessagesByConversation] = React.useState<
    Record<string, AssistantMessage[]>
  >({});
  const [pendingByConversation, setPendingByConversation] = React.useState<
    Record<string, AssistantToolCall[]>
  >({});
  const [streamingByConversation, setStreamingByConversation] = React.useState<
    Record<string, boolean>
  >({});
  const [streamTextByConversation, setStreamTextByConversation] = React.useState<
    Record<string, string>
  >({});
  const [errorByConversation, setErrorByConversation] = React.useState<
    Record<string, AssistantErrorInfo | undefined>
  >({});
  const [composerByConversation, setComposerByConversation] = React.useState<
    Record<string, string>
  >({});
  const conversationIdRef = React.useRef<string | null>(null);
  conversationIdRef.current = conversationId;
  const pendingByConversationRef = React.useRef(pendingByConversation);
  pendingByConversationRef.current = pendingByConversation;
  const generationByConversationRef = React.useRef<Record<string, number>>({});
  // useFileTree()/TerminalProvider hand back a new object on nearly every
  // render (tree listings, tab output, etc.). Reading through refs lets the
  // ui-action subscription below stay mounted for the component's lifetime
  // instead of tearing down and resubscribing on every such render, which
  // could otherwise drop a `switch_tab`/`reveal_in_files` event that fires
  // in the gap between unlisten and the new listener attaching (the Rust
  // side has already marked the tool call as run by then).
  const terminalSessionRef = React.useRef(terminalSession);
  terminalSessionRef.current = terminalSession;
  const fileTreeApiRef = React.useRef(fileTreeApi);
  fileTreeApiRef.current = fileTreeApi;

  // Composer drafts are keyed by conversation id (like messages/pending/
  // streaming) so a History click swaps to that chat's own draft instead of
  // carrying over whatever was typed for the previous one.
  const composerKey = conversationId ?? NEW_CHAT_COMPOSER_KEY;
  const composer = composerByConversation[composerKey] ?? "";
  const setComposer = React.useCallback(
    (value: string) => {
      setComposerByConversation((current) => ({ ...current, [composerKey]: value }));
    },
    [composerKey],
  );

  // A fetched message list only ever lands if its conversation is still active,
  // and any optimistic `local-user-*` row for that conversation survives unless
  // the fetch already carries the persisted copy (matched by content). Storing
  // the ledger keyed by conversation id (like pending/streaming) means a
  // History switch can never paint one chat's turns under another chat's id,
  // and a failed fetch for the newly selected id just leaves it unset instead
  // of falling back to whatever was previously on screen.
  const applyFetchedMessages = React.useCallback(
    (requestedId: string, list: readonly AssistantMessage[]) => {
      if (conversationIdRef.current !== requestedId) {
        return;
      }
      setMessagesByConversation((current) => {
        const localRows = (current[requestedId] ?? []).filter((message) =>
          message.id.startsWith("local-user-"),
        );
        if (localRows.length === 0) {
          return { ...current, [requestedId]: [...list] };
        }
        const fetchedUserContent = new Set(
          list.filter((message) => message.role === "user").map((message) => message.content),
        );
        const survivingLocal = localRows.filter((row) => !fetchedUserContent.has(row.content));
        return { ...current, [requestedId]: [...list, ...survivingLocal] };
      });
    },
    [],
  );

  // Mirrors `applyFetchedMessages`'s active-conversation guard: `list_messages`
  // hydrates pending tool calls from SQLite (Important 2) the same way it
  // hydrates the message history, so a reload or a History click restores an
  // unresolved Approve/Reject card instead of showing an empty ledger.
  const applyFetchedPending = React.useCallback(
    (requestedId: string, pending: readonly AssistantToolCall[]) => {
      if (conversationIdRef.current !== requestedId) {
        return;
      }
      setPendingByConversation((current) => ({ ...current, [requestedId]: [...pending] }));
    },
    [],
  );

  React.useEffect(() => {
    let cancelled = false;
    void listConversations()
      .then((list) => {
        if (cancelled) {
          return;
        }
        setConversations(list);
        setConversationId((current) => {
          const next = current ?? list[0]?.id ?? null;
          conversationIdRef.current = next;
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!conversationId) {
      return;
    }
    let cancelled = false;
    void listMessages(conversationId)
      .then(({ messages, pending }) => {
        if (!cancelled) {
          applyFetchedMessages(conversationId, messages);
          applyFetchedPending(conversationId, pending);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [conversationId, applyFetchedMessages, applyFetchedPending]);

  React.useEffect(() => {
    let cancelled = false;
    const stops: Array<() => void> = [];

    function keep(stop: () => void) {
      if (cancelled) {
        stop();
        return;
      }
      stops.push(stop);
    }

    void subscribeAssistantToken((payload) => {
      const id = payload.conversation_id;
      if (isStaleGeneration(generationByConversationRef.current, id, payload.generation)) {
        return;
      }
      setStreamingByConversation((current) => ({ ...current, [id]: true }));
      setStreamTextByConversation((current) => ({
        ...current,
        [id]: `${current[id] ?? ""}${payload.text}`,
      }));
      setErrorByConversation((current) => ({ ...current, [id]: undefined }));
    })
      .then(keep)
      .catch(() => undefined);

    void subscribeAssistantTurn((payload) => {
      const id = payload.conversation_id;
      if (isStaleGeneration(generationByConversationRef.current, id, payload.generation)) {
        return;
      }
      const isCancelSettle = payload.assistant_text === "" && payload.pending.length === 0;
      if (!isCancelSettle) {
        setPendingByConversation((current) => ({
          ...current,
          [id]: payload.pending.filter((call) => call.status === "pending"),
        }));
      }
      setStreamingByConversation((current) => ({ ...current, [id]: false }));
      setStreamTextByConversation((current) => ({ ...current, [id]: "" }));
      setErrorByConversation((current) => ({ ...current, [id]: undefined }));
      void listMessages(id)
        .then(({ messages, pending }) => {
          applyFetchedMessages(id, messages);
          applyFetchedPending(id, pending);
        })
        .catch(() => undefined);
    })
      .then(keep)
      .catch(() => undefined);

    void subscribeAssistantError((payload) => {
      const id = payload.conversation_id;
      if (isStaleGeneration(generationByConversationRef.current, id, payload.generation)) {
        return;
      }
      setStreamingByConversation((current) => ({ ...current, [id]: false }));
      setStreamTextByConversation((current) => ({ ...current, [id]: "" }));
      setErrorByConversation((current) => ({
        ...current,
        [id]: { code: payload.code, message: payload.message },
      }));
    })
      .then(keep)
      .catch(() => undefined);

    return () => {
      cancelled = true;
      for (const stop of stops) {
        stop();
      }
    };
  }, [applyFetchedMessages, applyFetchedPending]);

  React.useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void subscribeAssistantUiAction((payload) => {
      applyAssistantUiAction(payload, {
        setActive: terminalSessionRef.current?.setActive,
        revealPath: fileTreeApiRef.current?.revealPath,
      });
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

  const send = React.useCallback(async () => {
    const activeId = conversationId;
    const isActiveStreaming = activeId ? (streamingByConversation[activeId] ?? false) : false;
    if (!hasApiKey || isActiveStreaming) {
      return;
    }
    const text = composer.trim();
    if (!text) {
      return;
    }
    let id = activeId;
    try {
      if (!id) {
        const created = await createConversation();
        id = created.id;
        // Set the ref immediately: the listMessages effect fired by
        // setConversationId below can resolve before this render commits.
        conversationIdRef.current = id;
        setConversationId(created.id);
        setConversations((current) => [created, ...current.filter((row) => row.id !== created.id)]);
      }
      const sendingId = id;
      setStreamingByConversation((current) => ({ ...current, [sendingId]: true }));
      setStreamTextByConversation((current) => ({ ...current, [sendingId]: "" }));
      setErrorByConversation((current) => ({ ...current, [sendingId]: undefined }));
      const snapshot = buildSnapshot({
        tabs: terminalSession?.tabs ?? [],
        activeId: terminalSession?.activeId ?? "",
        readScrollback: terminalSession
          ? () => terminalSession.readScrollback(terminalSession.activeId)
          : () => "",
        contextLines,
        filesSelection: fileTreeApi
          ? toFilesSelection(fileTreeApi.nodes, fileTreeApi.selectedId)
          : null,
      });
      const result = await sendMessage(sendingId, text, snapshot);
      if (!result.accepted) {
        setStreamingByConversation((current) => ({ ...current, [sendingId]: false }));
        return;
      }
      if (result.generation !== undefined) {
        generationByConversationRef.current[sendingId] = result.generation;
      }
      // Clear the draft slot the text was actually typed into (the active
      // conversation at the time `send` was called) — safe regardless of
      // which conversation is current now, since drafts are keyed per chat.
      setComposerByConversation((current) => ({ ...current, [composerKey]: "" }));
      // If History moved to another chat while this send was in flight, leave
      // that chat's ledger alone; the real message is already persisted and
      // will arrive through that conversation's own fetch.
      if (conversationIdRef.current !== sendingId) {
        return;
      }
      setMessagesByConversation((current) => ({
        ...current,
        [sendingId]: [
          ...(current[sendingId] ?? []),
          {
            id: `local-user-${Date.now()}`,
            conversation_id: sendingId,
            role: "user",
            content: text,
            created_at: Date.now(),
          },
        ],
      }));
    } catch (err) {
      if (id) {
        const failedId = id;
        setStreamingByConversation((current) => ({ ...current, [failedId]: false }));
        setErrorByConversation((current) => ({ ...current, [failedId]: describeCaughtError(err) }));
      }
    }
  }, [
    composer,
    composerKey,
    conversationId,
    contextLines,
    fileTreeApi,
    hasApiKey,
    streamingByConversation,
    terminalSession,
  ]);

  const newChat = React.useCallback(async () => {
    try {
      const created = await createConversation();
      conversationIdRef.current = created.id;
      setConversationId(created.id);
      setConversations((current) => [created, ...current.filter((row) => row.id !== created.id)]);
      setMessagesByConversation((current) => ({ ...current, [created.id]: [] }));
      setPendingByConversation((current) => ({
        ...current,
        [created.id]: [],
      }));
      setStreamingByConversation((current) => ({ ...current, [created.id]: false }));
      setStreamTextByConversation((current) => ({ ...current, [created.id]: "" }));
      setErrorByConversation((current) => ({ ...current, [created.id]: undefined }));
    } catch {
      // Keep the current thread when create fails (no Tauri in some tests).
    }
  }, []);

  const selectConversation = React.useCallback((id: string) => {
    conversationIdRef.current = id;
    setConversationId(id);
  }, []);

  // Drops `id` from the active conversation's pending list and marks it
  // streaming (a resume-Gemini background task is now in flight on the Rust
  // side) as soon as the gate itself succeeds — never waiting on the `://turn`
  // event that eventually follows (Critical 1). A later `://turn` still
  // replaces pending with its own `payload.pending`, which is the source of
  // truth once it arrives.
  const conversationIdForTool = React.useCallback((id: string): string | null => {
    const fromRow = Object.values(pendingByConversationRef.current)
      .flat()
      .find((call) => call.id === id)?.conversation_id;
    return fromRow ?? conversationIdRef.current;
  }, []);

  const settlePendingAction = React.useCallback((id: string, conversationIdForCall: string) => {
    setPendingByConversation((current) => ({
      ...current,
      [conversationIdForCall]: (current[conversationIdForCall] ?? []).filter(
        (call) => call.id !== id,
      ),
    }));
    setStreamingByConversation((current) => ({ ...current, [conversationIdForCall]: true }));
    setStreamTextByConversation((current) => ({ ...current, [conversationIdForCall]: "" }));
    setErrorByConversation((current) => ({ ...current, [conversationIdForCall]: undefined }));
  }, []);

  const recordPendingActionError = React.useCallback(
    (conversationIdForCall: string, err: unknown) => {
      setErrorByConversation((current) => ({
        ...current,
        [conversationIdForCall]: describeCaughtError(err),
      }));
    },
    [],
  );

  const confirmPending = React.useCallback(
    async (id: string) => {
      const conversationIdForCall = conversationIdForTool(id);
      if (!conversationIdForCall) {
        return;
      }
      try {
        await confirmAction(id);
        settlePendingAction(id, conversationIdForCall);
      } catch (err) {
        // Failed confirm/reject keeps the card so the user can retry it.
        recordPendingActionError(conversationIdForCall, err);
      }
    },
    [conversationIdForTool, settlePendingAction, recordPendingActionError],
  );

  const rejectPending = React.useCallback(
    async (id: string) => {
      const conversationIdForCall = conversationIdForTool(id);
      if (!conversationIdForCall) {
        return;
      }
      try {
        await rejectAction(id);
        settlePendingAction(id, conversationIdForCall);
      } catch (err) {
        recordPendingActionError(conversationIdForCall, err);
      }
    },
    [conversationIdForTool, settlePendingAction, recordPendingActionError],
  );

  const cancel = React.useCallback(async () => {
    const activeId = conversationIdRef.current;
    if (!activeId) {
      return;
    }
    try {
      await cancelTurn(activeId);
    } catch {
      // Best-effort; the stream may finish on its own before cancel lands.
    }
    setStreamingByConversation((current) => ({ ...current, [activeId]: false }));
    setStreamTextByConversation((current) => ({ ...current, [activeId]: "" }));
  }, []);

  return {
    conversations,
    conversationId,
    messages: conversationId ? (messagesByConversation[conversationId] ?? []) : [],
    pending: conversationId ? (pendingByConversation[conversationId] ?? []) : [],
    streaming: conversationId ? (streamingByConversation[conversationId] ?? false) : false,
    streamText: conversationId ? (streamTextByConversation[conversationId] ?? "") : "",
    error: conversationId ? (errorByConversation[conversationId] ?? null) : null,
    composer,
    hasApiKey,
    setComposer,
    send,
    newChat,
    selectConversation,
    confirmPending,
    rejectPending,
    cancel,
  };
}
