import * as React from "react";
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
} from "../ipc/ipc.assistant";
import type { AssistantMessage, AssistantToolCall, Conversation } from "../ipc/ipc.types";
import type { AgentSettingsStub, AssistantApi } from "./assistant.types";
import { STUB_ASSISTANT_SNAPSHOT } from "./assistant.types";

const AgentSettingsContext = React.createContext<AgentSettingsStub>({ hasApiKey: false });

export function AgentSettingsStubProvider({
  hasApiKey = false,
  children,
}: {
  hasApiKey?: boolean;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ hasApiKey }), [hasApiKey]);
  return React.createElement(AgentSettingsContext.Provider, { value }, children);
}

export function useAgentSettings(): AgentSettingsStub {
  return React.useContext(AgentSettingsContext);
}

export function useAssistant(): AssistantApi {
  const { hasApiKey } = useAgentSettings();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<AssistantMessage[]>([]);
  const [pendingByConversation, setPendingByConversation] = React.useState<
    Record<string, AssistantToolCall[]>
  >({});
  const [streaming, setStreaming] = React.useState(false);
  const [streamText, setStreamText] = React.useState("");
  const [composer, setComposer] = React.useState("");
  const conversationIdRef = React.useRef<string | null>(null);
  conversationIdRef.current = conversationId;

  React.useEffect(() => {
    let cancelled = false;
    void listConversations()
      .then((list) => {
        if (cancelled) {
          return;
        }
        setConversations(list);
        setConversationId((current) => current ?? list[0]?.id ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    void listMessages(conversationId)
      .then((list) => {
        if (!cancelled) {
          setMessages(list);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

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
      if (payload.conversation_id !== conversationIdRef.current) {
        return;
      }
      setStreaming(true);
      setStreamText((current) => `${current}${payload.text}`);
    })
      .then(keep)
      .catch(() => undefined);

    void subscribeAssistantTurn((payload) => {
      setPendingByConversation((current) => ({
        ...current,
        [payload.conversation_id]: payload.pending.filter((call) => call.status === "pending"),
      }));
      if (payload.conversation_id !== conversationIdRef.current) {
        return;
      }
      setStreaming(false);
      setStreamText("");
      void listMessages(payload.conversation_id)
        .then(setMessages)
        .catch(() => undefined);
    })
      .then(keep)
      .catch(() => undefined);

    void subscribeAssistantError((payload) => {
      if (payload.conversation_id !== conversationIdRef.current) {
        return;
      }
      setStreaming(false);
    })
      .then(keep)
      .catch(() => undefined);

    return () => {
      cancelled = true;
      for (const stop of stops) {
        stop();
      }
    };
  }, []);

  const send = React.useCallback(async () => {
    if (!hasApiKey || streaming) {
      return;
    }
    const text = composer.trim();
    if (!text) {
      return;
    }
    let id = conversationId;
    try {
      if (!id) {
        const created = await createConversation();
        id = created.id;
        setConversationId(created.id);
        setConversations((current) => [created, ...current.filter((row) => row.id !== created.id)]);
      }
      setStreaming(true);
      setStreamText("");
      const result = await sendMessage(id, text, STUB_ASSISTANT_SNAPSHOT);
      if (!result.accepted) {
        setStreaming(false);
        return;
      }
      setComposer("");
      setMessages((current) => [
        ...current,
        {
          id: `local-user-${Date.now()}`,
          conversation_id: id,
          role: "user",
          content: text,
          created_at: Date.now(),
        },
      ]);
    } catch {
      setStreaming(false);
    }
  }, [composer, conversationId, hasApiKey, streaming]);

  const newChat = React.useCallback(async () => {
    try {
      const created = await createConversation();
      setConversationId(created.id);
      setConversations((current) => [created, ...current.filter((row) => row.id !== created.id)]);
      setMessages([]);
      setPendingByConversation((current) => ({
        ...current,
        [created.id]: [],
      }));
      setStreamText("");
      setStreaming(false);
    } catch {
      // Keep the current thread when create fails (no Tauri in some tests).
    }
  }, []);

  const selectConversation = React.useCallback((id: string) => {
    setConversationId(id);
    setStreamText("");
    setStreaming(false);
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
    messages,
    pending: conversationId ? (pendingByConversation[conversationId] ?? []) : [],
    streaming,
    streamText,
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
