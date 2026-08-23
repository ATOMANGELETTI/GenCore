import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: listenMock,
}));

describe("ipc.assistant", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    listenMock.mockReset();
  });

  it("invokes list_conversations with no args", async () => {
    const { listConversations } = await import("../../src/modules/ipc/ipc.assistant");
    invokeMock.mockResolvedValueOnce([]);

    const result = await listConversations();

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|list_conversations");
    expect(result).toEqual([]);
  });

  it("invokes create_conversation with no args", async () => {
    const { createConversation } = await import("../../src/modules/ipc/ipc.assistant");
    const conversation = { id: "c1", title: "New chat", created_at: 1, updated_at: 1 };
    invokeMock.mockResolvedValueOnce(conversation);

    const result = await createConversation();

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|create_conversation");
    expect(result).toEqual(conversation);
  });

  it("invokes delete_conversation with snake_case conversation_id", async () => {
    const { deleteConversation } = await import("../../src/modules/ipc/ipc.assistant");
    invokeMock.mockResolvedValueOnce(undefined);

    await deleteConversation("c1");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|delete_conversation", {
      conversation_id: "c1",
    });
  });

  it("invokes list_messages with snake_case conversation_id", async () => {
    const { listMessages } = await import("../../src/modules/ipc/ipc.assistant");
    invokeMock.mockResolvedValueOnce([]);

    const result = await listMessages("c1");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|list_messages", {
      conversation_id: "c1",
    });
    expect(result).toEqual([]);
  });

  it("invokes send_message with snake_case conversation_id and a raw snapshot", async () => {
    const { sendMessage } = await import("../../src/modules/ipc/ipc.assistant");
    invokeMock.mockResolvedValueOnce({ accepted: true });

    const snapshot = {
      active_tab_id: "tab-1",
      active_session_id: "session-1",
      cwd: "C:\\work",
      output_excerpt: "PS>",
      tabs: [{ id: "tab-1", name: "pwsh", cwd: "C:\\work", pinned: false }],
      files_selection: { path: "C:\\work\\file.txt", kind: "file" },
    };

    const result = await sendMessage("c1", "list files", snapshot);

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|send_message", {
      conversation_id: "c1",
      text: "list files",
      snapshot,
    });
    expect(result).toEqual({ accepted: true });
  });

  it("invokes cancel_turn with snake_case conversation_id", async () => {
    const { cancelTurn } = await import("../../src/modules/ipc/ipc.assistant");
    invokeMock.mockResolvedValueOnce(undefined);

    await cancelTurn("c1");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|cancel_turn", {
      conversation_id: "c1",
    });
  });

  it("invokes confirm_action with id only", async () => {
    const { confirmAction } = await import("../../src/modules/ipc/ipc.assistant");
    const outcome = { name: "pty_write", result_json: "{}", ui_action: null };
    invokeMock.mockResolvedValueOnce(outcome);

    const result = await confirmAction("tool-1");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|confirm_action", {
      id: "tool-1",
    });
    expect(result).toEqual(outcome);
  });

  it("invokes reject_action with id only", async () => {
    const { rejectAction } = await import("../../src/modules/ipc/ipc.assistant");
    invokeMock.mockResolvedValueOnce(undefined);

    await rejectAction("tool-1");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|reject_action", {
      id: "tool-1",
    });
  });

  it("invokes get_agent_settings with no args", async () => {
    const { getAgentSettings } = await import("../../src/modules/ipc/ipc.assistant");
    const settings = { model: "gemini-3.7-flash", context_lines: 80, has_api_key: false };
    invokeMock.mockResolvedValueOnce(settings);

    const result = await getAgentSettings();

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|get_agent_settings");
    expect(result).toEqual(settings);
  });

  it("invokes set_agent_settings with snake_case context_lines", async () => {
    const { setAgentSettings } = await import("../../src/modules/ipc/ipc.assistant");
    const settings = { model: "gemini-3.5-flash", context_lines: 100, has_api_key: false };
    invokeMock.mockResolvedValueOnce(settings);

    const result = await setAgentSettings({ model: "gemini-3.5-flash", context_lines: 100 });

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|set_agent_settings", {
      model: "gemini-3.5-flash",
      context_lines: 100,
    });
    expect(result).toEqual(settings);
  });

  it("invokes set_agent_settings with an empty patch", async () => {
    const { setAgentSettings } = await import("../../src/modules/ipc/ipc.assistant");
    invokeMock.mockResolvedValueOnce({
      model: "gemini-3.7-flash",
      context_lines: 80,
      has_api_key: false,
    });

    await setAgentSettings({});

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|set_agent_settings", {});
  });

  it("invokes set_api_key with key only", async () => {
    const { setApiKey } = await import("../../src/modules/ipc/ipc.assistant");
    invokeMock.mockResolvedValueOnce(undefined);

    await setApiKey("secret-key");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|set_api_key", {
      key: "secret-key",
    });
  });

  it("invokes clear_api_key with no args", async () => {
    const { clearApiKey } = await import("../../src/modules/ipc/ipc.assistant");
    invokeMock.mockResolvedValueOnce(undefined);

    await clearApiKey();

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-assistant|clear_api_key");
  });

  it("subscribes to gencore-assistant://token and returns the unlisten function", async () => {
    const unlisten = vi.fn();
    listenMock.mockResolvedValueOnce(unlisten);
    const { subscribeAssistantToken } = await import("../../src/modules/ipc/ipc.assistant");
    const handler = vi.fn();

    const result = await subscribeAssistantToken(handler);

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock.mock.calls[0]?.[0]).toBe("gencore-assistant://token");
    expect(result).toBe(unlisten);

    const listenHandler = listenMock.mock.calls[0]?.[1] as (event: {
      payload: { conversation_id: string; text: string };
    }) => void;
    listenHandler({ payload: { conversation_id: "c1", text: "hi" } });
    expect(handler).toHaveBeenCalledWith({ conversation_id: "c1", text: "hi" });
  });

  it("subscribes to gencore-assistant://turn and returns the unlisten function", async () => {
    const unlisten = vi.fn();
    listenMock.mockResolvedValueOnce(unlisten);
    const { subscribeAssistantTurn } = await import("../../src/modules/ipc/ipc.assistant");
    const handler = vi.fn();

    const result = await subscribeAssistantTurn(handler);

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock.mock.calls[0]?.[0]).toBe("gencore-assistant://turn");
    expect(result).toBe(unlisten);

    const listenHandler = listenMock.mock.calls[0]?.[1] as (event: {
      payload: { conversation_id: string; assistant_text: string; pending: unknown[] };
    }) => void;
    listenHandler({ payload: { conversation_id: "c1", assistant_text: "hi", pending: [] } });
    expect(handler).toHaveBeenCalledWith({
      conversation_id: "c1",
      assistant_text: "hi",
      pending: [],
    });
  });

  it("subscribes to gencore-assistant://error and returns the unlisten function", async () => {
    const unlisten = vi.fn();
    listenMock.mockResolvedValueOnce(unlisten);
    const { subscribeAssistantError } = await import("../../src/modules/ipc/ipc.assistant");
    const handler = vi.fn();

    const result = await subscribeAssistantError(handler);

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock.mock.calls[0]?.[0]).toBe("gencore-assistant://error");
    expect(result).toBe(unlisten);

    const listenHandler = listenMock.mock.calls[0]?.[1] as (event: {
      payload: { conversation_id: string; error: string };
    }) => void;
    listenHandler({ payload: { conversation_id: "c1", error: "boom" } });
    expect(handler).toHaveBeenCalledWith({ conversation_id: "c1", error: "boom" });
  });

  it("subscribes to gencore-assistant://ui-action and returns the unlisten function", async () => {
    const unlisten = vi.fn();
    listenMock.mockResolvedValueOnce(unlisten);
    const { subscribeAssistantUiAction } = await import("../../src/modules/ipc/ipc.assistant");
    const handler = vi.fn();

    const result = await subscribeAssistantUiAction(handler);

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock.mock.calls[0]?.[0]).toBe("gencore-assistant://ui-action");
    expect(result).toBe(unlisten);

    const listenHandler = listenMock.mock.calls[0]?.[1] as (event: {
      payload: { id: string; name: string; args: unknown };
    }) => void;
    listenHandler({ payload: { id: "tool-1", name: "switch_tab", args: { tab_id: "tab-2" } } });
    expect(handler).toHaveBeenCalledWith({
      id: "tool-1",
      name: "switch_tab",
      args: { tab_id: "tab-2" },
    });
  });
});
