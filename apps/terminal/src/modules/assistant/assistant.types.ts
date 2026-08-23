import type {
  AssistantMessage,
  AssistantSnapshot,
  AssistantToolCall,
  Conversation,
} from "../ipc/ipc.types";

export interface AgentSettingsStub {
  readonly hasApiKey: boolean;
}

export const STUB_ASSISTANT_SNAPSHOT: AssistantSnapshot = {
  active_tab_id: "stub",
  output_excerpt: "",
  tabs: [],
};

export interface AssistantApi {
  readonly conversations: readonly Conversation[];
  readonly conversationId: string | null;
  readonly messages: readonly AssistantMessage[];
  readonly pending: readonly AssistantToolCall[];
  readonly streaming: boolean;
  readonly streamText: string;
  readonly composer: string;
  readonly hasApiKey: boolean;
  readonly setComposer: (value: string) => void;
  readonly send: () => Promise<void>;
  readonly newChat: () => Promise<void>;
  readonly selectConversation: (id: string) => void;
  readonly confirmPending: (id: string) => Promise<void>;
  readonly rejectPending: (id: string) => Promise<void>;
}
