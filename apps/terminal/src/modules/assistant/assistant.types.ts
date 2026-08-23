import type { AssistantMessage, AssistantToolCall, Conversation } from "../ipc/ipc.types";

export interface AgentSettingsStub {
  readonly hasApiKey: boolean;
}

/** A `gencore-assistant://error` rendered in the ledger for the active conversation. */
export interface AssistantErrorInfo {
  readonly code: string;
  readonly message: string;
}

export interface AssistantApi {
  readonly conversations: readonly Conversation[];
  readonly conversationId: string | null;
  readonly messages: readonly AssistantMessage[];
  readonly pending: readonly AssistantToolCall[];
  readonly streaming: boolean;
  readonly streamText: string;
  readonly error: AssistantErrorInfo | null;
  readonly composer: string;
  readonly hasApiKey: boolean;
  readonly setComposer: (value: string) => void;
  readonly send: () => Promise<void>;
  readonly newChat: () => Promise<void>;
  readonly selectConversation: (id: string) => void;
  readonly confirmPending: (id: string) => Promise<void>;
  readonly rejectPending: (id: string) => Promise<void>;
  readonly cancel: () => Promise<void>;
}
