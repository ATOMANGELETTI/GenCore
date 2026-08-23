import * as React from "react";
import {
  AgentSettingsContext,
  type AgentSettingsValue,
  useAgentSettings,
} from "../config/config.agent";
import { toFilesSelection, useFileTreeApiOptional } from "../file-tree/file-tree.hook";
import {
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
import type { AssistantApi } from "./assistant.types";

export { useAgentSettings };

/**
 * Applies a `gencore-assistant://ui-action` payload emitted after the user
 * confirms `switch_tab` or `reveal_in_files`. Unknown action names and
 * malformed args are silent no-ops; the tool already ran on the Rust side.
 */
export function applyAssistantUiAction(
  payload: AssistantUiActionPayload,
  handlers: {
    setActive?: (id: string) => void;
    revealPath?: (path: string) => void;
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
  }
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
      saveKey: async () => undefined,
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
  const [composer, setComposer] = React.useState("");
  const conversationIdRef = React.useRef<string | null>(null);
  conversationIdRef.current = conversationId;

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
      .then((list) => {
        if (!cancelled) {
          applyFetchedMessages(conversationId, list);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [conversationId, applyFetchedMessages]);

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
      setStreamingByConversation((current) => ({ ...current, [id]: true }));
      setStreamTextByConversation((current) => ({
        ...current,
        [id]: `${current[id] ?? ""}${payload.text}`,
      }));
    })
      .then(keep)
      .catch(() => undefined);

    void subscribeAssistantTurn((payload) => {
      const id = payload.conversation_id;
      setPendingByConversation((current) => ({
        ...current,
        [id]: payload.pending.filter((call) => call.status === "pending"),
      }));
      setStreamingByConversation((current) => ({ ...current, [id]: false }));
      setStreamTextByConversation((current) => ({ ...current, [id]: "" }));
      void listMessages(id)
        .then((list) => {
          applyFetchedMessages(id, list);
        })
        .catch(() => undefined);
    })
      .then(keep)
      .catch(() => undefined);

    void subscribeAssistantError((payload) => {
      const id = payload.conversation_id;
      setStreamingByConversation((current) => ({ ...current, [id]: false }));
    })
      .then(keep)
      .catch(() => undefined);

    return () => {
      cancelled = true;
      for (const stop of stops) {
        stop();
      }
    };
  }, [applyFetchedMessages]);

  React.useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void subscribeAssistantUiAction((payload) => {
      applyAssistantUiAction(payload, {
        setActive: terminalSession?.setActive,
        revealPath: fileTreeApi?.revealPath,
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
  }, [terminalSession, fileTreeApi]);

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
      // If History moved to another chat while this send was in flight, leave
      // that chat's composer and ledger alone; the real message is already
      // persisted and will arrive through that conversation's own fetch.
      if (conversationIdRef.current !== sendingId) {
        return;
      }
      setComposer("");
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
    } catch {
      if (id) {
        const failedId = id;
        setStreamingByConversation((current) => ({ ...current, [failedId]: false }));
      }
    }
  }, [
    composer,
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
    } catch {
      // Keep the current thread when create fails (no Tauri in some tests).
    }
  }, []);

  const selectConversation = React.useCallback((id: string) => {
    conversationIdRef.current = id;
    setConversationId(id);
  }, []);

  const confirmPending = React.useCallback(async (id: string) => {
    try {
      await confirmAction(id);
    } catch {
      // Confirm is best-effort in this task; the pending row stays until a turn event.
    }
  }, []);

  const rejectPending = React.useCallback(async (id: string) => {
    try {
      await rejectAction(id);
    } catch {
      // Reject is best-effort in this task; the pending row stays until a turn event.
    }
  }, []);

  return {
    conversations,
    conversationId,
    messages: conversationId ? (messagesByConversation[conversationId] ?? []) : [],
    pending: conversationId ? (pendingByConversation[conversationId] ?? []) : [],
    streaming: conversationId ? (streamingByConversation[conversationId] ?? false) : false,
    streamText: conversationId ? (streamTextByConversation[conversationId] ?? "") : "",
    composer,
    hasApiKey,
    setComposer,
    send,
    newChat,
    selectConversation,
    confirmPending,
    rejectPending,
  };
}
