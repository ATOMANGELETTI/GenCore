import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantToolCall, Conversation } from "../../src/modules/ipc/ipc.types";

const {
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  confirmAction,
  rejectAction,
  subscribeAssistantToken,
  subscribeAssistantTurn,
  subscribeAssistantError,
  subscribeAssistantUiAction,
} = vi.hoisted(() => ({
  listConversations: vi.fn(),
  createConversation: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  confirmAction: vi.fn(),
  rejectAction: vi.fn(),
  subscribeAssistantToken: vi.fn(),
  subscribeAssistantTurn: vi.fn(),
  subscribeAssistantError: vi.fn(),
  subscribeAssistantUiAction: vi.fn(),
}));

vi.mock("../../src/modules/ipc/ipc.assistant", () => ({
  listConversations,
  createConversation,
  deleteConversation: vi.fn(),
  listMessages,
  sendMessage,
  cancelTurn: vi.fn(),
  confirmAction,
  rejectAction,
  subscribeAssistantToken,
  subscribeAssistantTurn,
  subscribeAssistantError,
  subscribeAssistantUiAction,
}));

import {
  AgentSettingsStubProvider,
  useAssistant,
} from "../../src/modules/assistant/assistant.hook";
import { STUB_ASSISTANT_SNAPSHOT } from "../../src/modules/assistant/assistant.types";

const CONVERSATION: Conversation = {
  id: "c1",
  title: "New chat",
  created_at: 1,
  updated_at: 1,
};

const OTHER_CONVERSATION: Conversation = {
  id: "c2",
  title: "Other",
  created_at: 2,
  updated_at: 2,
};

function Probe() {
  const assistant = useAssistant();
  return (
    <div>
      <span data-testid="has-key">{String(assistant.hasApiKey)}</span>
      <span data-testid="streaming">{String(assistant.streaming)}</span>
      <span data-testid="pending-count">{assistant.pending.length}</span>
      <span data-testid="conversation-id">{assistant.conversationId ?? ""}</span>
      <ul data-testid="messages">
        {assistant.messages.map((message) => (
          <li key={message.id} data-role={message.role}>
            {message.content}
          </li>
        ))}
      </ul>
      <input
        aria-label="composer"
        value={assistant.composer}
        onChange={(event) => {
          assistant.setComposer(event.target.value);
        }}
      />
      <button type="button" onClick={() => void assistant.send()}>
        send
      </button>
      <button type="button" onClick={() => void assistant.newChat()}>
        new
      </button>
      {assistant.conversations.map((conversation) => (
        <button
          key={conversation.id}
          type="button"
          onClick={() => {
            assistant.selectConversation(conversation.id);
          }}
        >
          {`select-${conversation.id}`}
        </button>
      ))}
      <button
        type="button"
        onClick={() => {
          const id = assistant.pending[0]?.id;
          if (id) {
            void assistant.confirmPending(id);
          }
        }}
      >
        approve
      </button>
      <button
        type="button"
        onClick={() => {
          const id = assistant.pending[0]?.id;
          if (id) {
            void assistant.rejectPending(id);
          }
        }}
      >
        reject
      </button>
    </div>
  );
}

function mockIdleIpc() {
  listConversations.mockResolvedValue([]);
  createConversation.mockResolvedValue(CONVERSATION);
  listMessages.mockResolvedValue([]);
  sendMessage.mockResolvedValue({ accepted: true });
  confirmAction.mockResolvedValue({ name: "pty_write", result_json: "{}", ui_action: null });
  rejectAction.mockResolvedValue(undefined);
  subscribeAssistantToken.mockResolvedValue(() => {});
  subscribeAssistantTurn.mockResolvedValue(() => {});
  subscribeAssistantError.mockResolvedValue(() => {});
  subscribeAssistantUiAction.mockResolvedValue(() => {});
}

function renderHookProbe(hasApiKey: boolean) {
  return render(
    <AgentSettingsStubProvider hasApiKey={hasApiKey}>
      <Probe />
    </AgentSettingsStubProvider>,
  );
}

describe("useAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdleIpc();
  });

  it("does not send when no API key is stubbed", async () => {
    const user = userEvent.setup();
    renderHookProbe(false);
    expect(screen.getByTestId("has-key")).toHaveTextContent("false");

    await user.type(screen.getByLabelText("composer"), "hello");
    await user.click(screen.getByText("send"));

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("sends with the stub snapshot when a key is present", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    renderHookProbe(true);

    await waitFor(() => {
      expect(listConversations).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText("composer"), "hello");
    await user.click(screen.getByText("send"));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith("c1", "hello", STUB_ASSISTANT_SNAPSHOT);
    });
    expect(STUB_ASSISTANT_SNAPSHOT).toEqual({
      active_tab_id: "stub",
      output_excerpt: "",
      tabs: [],
    });
  });

  it("creates a conversation when New chat is requested", async () => {
    const user = userEvent.setup();
    renderHookProbe(true);

    await user.click(screen.getByText("new"));

    await waitFor(() => {
      expect(createConversation).toHaveBeenCalledTimes(1);
    });
  });

  it("confirms and rejects the pending tool id", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    let onTurn:
      | ((payload: {
          conversation_id: string;
          assistant_text: string;
          pending: { id: string; status: string }[];
        }) => void)
      | undefined;
    subscribeAssistantTurn.mockImplementation(async (handler) => {
      onTurn = handler;
      return () => {};
    });

    renderHookProbe(true);
    await waitFor(() => {
      expect(onTurn).toBeTypeOf("function");
    });

    onTurn?.({
      conversation_id: "c1",
      assistant_text: "ok",
      pending: [{ id: "tool-1", status: "pending" }],
    });

    await waitFor(() => {
      expect(screen.getByTestId("pending-count")).toHaveTextContent("1");
    });

    await user.click(screen.getByText("approve"));
    await waitFor(() => {
      expect(confirmAction).toHaveBeenCalledWith("tool-1");
    });

    await user.click(screen.getByText("reject"));
    await waitFor(() => {
      expect(rejectAction).toHaveBeenCalledWith("tool-1");
    });
  });

  it("keeps pending after selecting another conversation and returning", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION, OTHER_CONVERSATION]);
    let onTurn:
      | ((payload: {
          conversation_id: string;
          assistant_text: string;
          pending: Pick<AssistantToolCall, "id" | "status">[];
        }) => void)
      | undefined;
    subscribeAssistantTurn.mockImplementation(async (handler) => {
      onTurn = handler;
      return () => {};
    });

    renderHookProbe(true);
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c1");
      expect(onTurn).toBeTypeOf("function");
    });

    onTurn?.({
      conversation_id: "c1",
      assistant_text: "ok",
      pending: [{ id: "tool-1", status: "pending" }],
    });
    await waitFor(() => {
      expect(screen.getByTestId("pending-count")).toHaveTextContent("1");
    });

    await user.click(screen.getByText("select-c2"));
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c2");
      expect(screen.getByTestId("pending-count")).toHaveTextContent("0");
    });

    await user.click(screen.getByText("select-c1"));
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c1");
      expect(screen.getByTestId("pending-count")).toHaveTextContent("1");
    });
  });

  it("appends the user turn after send accepts", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    renderHookProbe(true);

    await waitFor(() => {
      expect(listConversations).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText("composer"), "hello");
    await user.click(screen.getByText("send"));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith("c1", "hello", STUB_ASSISTANT_SNAPSHOT);
    });
    const userTurn = screen.getByTestId("messages").querySelector("[data-role='user']");
    expect(userTurn).toHaveTextContent("hello");
    expect(screen.getByLabelText("composer")).toHaveValue("");
  });

  it("restores the composer when send fails", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    sendMessage.mockRejectedValue(new Error("offline"));
    renderHookProbe(true);

    await waitFor(() => {
      expect(listConversations).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText("composer"), "keep this draft");
    await user.click(screen.getByText("send"));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
    });
    expect(screen.getByLabelText("composer")).toHaveValue("keep this draft");
    expect(screen.getByTestId("messages")).toBeEmptyDOMElement();
  });
});
