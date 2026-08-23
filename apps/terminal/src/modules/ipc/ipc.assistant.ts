import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  AgentSettings,
  AgentSettingsPatch,
  AssistantErrorPayload,
  AssistantSnapshot,
  AssistantTokenPayload,
  AssistantTurnPayload,
  AssistantUiActionPayload,
  ConfirmActionResult,
  Conversation,
  ListMessagesResult,
  SendMessageResult,
} from "./ipc.types";

const LIST_CONVERSATIONS_COMMAND = "plugin:gencore-assistant|list_conversations";
const CREATE_CONVERSATION_COMMAND = "plugin:gencore-assistant|create_conversation";
const DELETE_CONVERSATION_COMMAND = "plugin:gencore-assistant|delete_conversation";
const LIST_MESSAGES_COMMAND = "plugin:gencore-assistant|list_messages";
const SEND_MESSAGE_COMMAND = "plugin:gencore-assistant|send_message";
const CANCEL_TURN_COMMAND = "plugin:gencore-assistant|cancel_turn";
const CONFIRM_ACTION_COMMAND = "plugin:gencore-assistant|confirm_action";
const REJECT_ACTION_COMMAND = "plugin:gencore-assistant|reject_action";
const GET_AGENT_SETTINGS_COMMAND = "plugin:gencore-assistant|get_agent_settings";
const SET_AGENT_SETTINGS_COMMAND = "plugin:gencore-assistant|set_agent_settings";
const SET_API_KEY_COMMAND = "plugin:gencore-assistant|set_api_key";
const CLEAR_API_KEY_COMMAND = "plugin:gencore-assistant|clear_api_key";

const ASSISTANT_TOKEN_EVENT = "gencore-assistant://token";
const ASSISTANT_TURN_EVENT = "gencore-assistant://turn";
const ASSISTANT_ERROR_EVENT = "gencore-assistant://error";
const ASSISTANT_UI_ACTION_EVENT = "gencore-assistant://ui-action";

/**
 * Gemini Assistant IPC for the Terminal side panel. Every command goes
 * through this module so the Isolation allowlist and capabilities stay
 * auditable in one place.
 */
export function listConversations(): Promise<Conversation[]> {
  return invoke<Conversation[]>(LIST_CONVERSATIONS_COMMAND);
}

export function createConversation(): Promise<Conversation> {
  return invoke<Conversation>(CREATE_CONVERSATION_COMMAND);
}

export function deleteConversation(conversationId: string): Promise<void> {
  return invoke<void>(DELETE_CONVERSATION_COMMAND, { conversation_id: conversationId });
}

export function listMessages(conversationId: string): Promise<ListMessagesResult> {
  return invoke<ListMessagesResult>(LIST_MESSAGES_COMMAND, { conversation_id: conversationId });
}

export function sendMessage(
  conversationId: string,
  text: string,
  snapshot: AssistantSnapshot,
): Promise<SendMessageResult> {
  return invoke<SendMessageResult>(SEND_MESSAGE_COMMAND, {
    conversation_id: conversationId,
    text,
    snapshot,
  });
}

export function cancelTurn(conversationId: string): Promise<void> {
  return invoke<void>(CANCEL_TURN_COMMAND, { conversation_id: conversationId });
}

export function confirmAction(id: string): Promise<ConfirmActionResult> {
  return invoke<ConfirmActionResult>(CONFIRM_ACTION_COMMAND, { id });
}

export function rejectAction(id: string): Promise<void> {
  return invoke<void>(REJECT_ACTION_COMMAND, { id });
}

export function getAgentSettings(): Promise<AgentSettings> {
  return invoke<AgentSettings>(GET_AGENT_SETTINGS_COMMAND);
}

export function setAgentSettings(patch: AgentSettingsPatch): Promise<AgentSettings> {
  return invoke<AgentSettings>(SET_AGENT_SETTINGS_COMMAND, { ...patch });
}

export function setApiKey(key: string): Promise<void> {
  return invoke<void>(SET_API_KEY_COMMAND, { key });
}

export function clearApiKey(): Promise<void> {
  return invoke<void>(CLEAR_API_KEY_COMMAND);
}

export function subscribeAssistantToken(
  handler: (payload: AssistantTokenPayload) => void,
): Promise<() => void> {
  return listen<AssistantTokenPayload>(ASSISTANT_TOKEN_EVENT, (event) => {
    handler(event.payload);
  });
}

export function subscribeAssistantTurn(
  handler: (payload: AssistantTurnPayload) => void,
): Promise<() => void> {
  return listen<AssistantTurnPayload>(ASSISTANT_TURN_EVENT, (event) => {
    handler(event.payload);
  });
}

export function subscribeAssistantError(
  handler: (payload: AssistantErrorPayload) => void,
): Promise<() => void> {
  return listen<AssistantErrorPayload>(ASSISTANT_ERROR_EVENT, (event) => {
    handler(event.payload);
  });
}

export function subscribeAssistantUiAction(
  handler: (payload: AssistantUiActionPayload) => void,
): Promise<() => void> {
  return listen<AssistantUiActionPayload>(ASSISTANT_UI_ACTION_EVENT, (event) => {
    handler(event.payload);
  });
}
