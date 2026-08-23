import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AssistantMessage,
  AssistantToolCall,
  Conversation,
} from "../../src/modules/ipc/ipc.types";

const {
  listConversations,
  listMessages,
  sendMessage,
  subscribeAssistantToken,
  subscribeAssistantTurn,
  subscribeAssistantError,
  subscribeAssistantUiAction,
} = vi.hoisted(() => ({
  listConversations: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  subscribeAssistantToken: vi.fn(),
  subscribeAssistantTurn: vi.fn(),
  subscribeAssistantError: vi.fn(),
  subscribeAssistantUiAction: vi.fn(),
}));

vi.mock("../../src/modules/ipc/ipc.assistant", () => ({
  listConversations,
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  listMessages,
  sendMessage,
  cancelTurn: vi.fn(),
  confirmAction: vi.fn(),
  rejectAction: vi.fn(),
  subscribeAssistantToken,
  subscribeAssistantTurn,
  subscribeAssistantError,
  subscribeAssistantUiAction,
}));

import { Assistant } from "../../src/modules/assistant/assistant.component";
import { AgentSettingsStubProvider } from "../../src/modules/assistant/assistant.hook";

const CONVERSATION: Conversation = {
  id: "c1",
  title: "Hello",
  created_at: 1,
  updated_at: 1,
};

const OTHER_CONVERSATION: Conversation = {
  id: "c2",
  title: "Other",
  created_at: 2,
  updated_at: 2,
};

const USER_MESSAGE: AssistantMessage = {
  id: "m1",
  conversation_id: "c1",
  role: "user",
  content: "List the files",
  created_at: 1,
};

const ASSISTANT_MESSAGE: AssistantMessage = {
  id: "m2",
  conversation_id: "c1",
  role: "assistant",
  content: "I can list them after you approve.",
  created_at: 2,
};

const PENDING_WRITE: AssistantToolCall = {
  id: "tool-1",
  conversation_id: "c1",
  message_id: "m2",
  name: "pty_write",
  args_json: '{"data":"Get-ChildItem"}',
  status: "pending",
  result_json: null,
  created_at: 3,
  resolved_at: null,
};

function mockIdleIpc() {
  listConversations.mockResolvedValue([]);
  listMessages.mockResolvedValue([]);
  sendMessage.mockResolvedValue({ accepted: true });
  subscribeAssistantToken.mockResolvedValue(() => {});
  subscribeAssistantTurn.mockResolvedValue(() => {});
  subscribeAssistantError.mockResolvedValue(() => {});
  subscribeAssistantUiAction.mockResolvedValue(() => {});
}

function renderAssistant(hasApiKey: boolean) {
  return render(
    <AgentSettingsStubProvider hasApiKey={hasApiKey}>
      <Assistant />
    </AgentSettingsStubProvider>,
  );
}

describe("Assistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdleIpc();
  });

  it("shows the no-key copy and disables the composer", async () => {
    renderAssistant(false);

    const empty = await screen.findByText("Set a Gemini API key in Config to start chatting.");
    expect(empty).toBeVisible();
    expect(empty).toHaveClass("text-sm", "text-muted-foreground");
    expect(screen.getByRole("textbox", { name: "Message" })).toBeDisabled();
  });

  it("renders You and Assistant kickers for ledger messages", async () => {
    listConversations.mockResolvedValue([CONVERSATION]);
    listMessages.mockResolvedValue([USER_MESSAGE, ASSISTANT_MESSAGE]);

    renderAssistant(true);

    const you = await screen.findByText("You");
    const assistant = await screen.findByText("Assistant");
    expect(you).toHaveClass(
      "text-[10px]",
      "font-semibold",
      "uppercase",
      "tracking-wide",
      "text-muted-foreground",
    );
    expect(assistant).toHaveClass(
      "text-[10px]",
      "font-semibold",
      "uppercase",
      "tracking-wide",
      "text-primary",
    );
    expect(assistant).not.toHaveClass("text-muted-foreground");
    expect(screen.getByText("List the files")).toHaveClass("select-text");
    expect(screen.getByText("I can list them after you approve.")).toHaveClass("select-text");
  });

  it("shows Approve and Reject for a pending PTY write", async () => {
    listConversations.mockResolvedValue([CONVERSATION]);
    listMessages.mockResolvedValue([USER_MESSAGE, ASSISTANT_MESSAGE]);
    let onTurn:
      | ((payload: {
          conversation_id: string;
          assistant_text: string;
          pending: AssistantToolCall[];
        }) => void)
      | undefined;
    subscribeAssistantTurn.mockImplementation(async (handler) => {
      onTurn = handler;
      return () => {};
    });

    renderAssistant(true);
    await screen.findByText("You");

    await waitFor(() => {
      expect(onTurn).toBeTypeOf("function");
    });
    act(() => {
      onTurn?.({
        conversation_id: "c1",
        assistant_text: ASSISTANT_MESSAGE.content,
        pending: [PENDING_WRITE],
      });
    });

    expect(screen.getByText("PTY write")).toBeVisible();
    expect(screen.getByText("Tab · pending")).toBeVisible();
    expect(screen.getByText("Get-ChildItem")).toHaveClass("font-mono");
    const approve = screen.getByRole("button", { name: "Approve" });
    const reject = screen.getByRole("button", { name: "Reject" });
    expect(approve).toHaveClass("text-success");
    expect(reject).toHaveClass("text-destructive");
  });

  it("names the History trigger and New chat button", async () => {
    renderAssistant(false);

    expect(await screen.findByRole("button", { name: "History" })).toBeVisible();
    expect(screen.getByRole("button", { name: "New chat" })).toBeVisible();
    expect(screen.getByText("ASSISTANT")).toHaveClass(
      "text-[10px]",
      "font-semibold",
      "uppercase",
      "tracking-wide",
      "text-muted-foreground",
    );
    expect(screen.getByText("ASSISTANT").parentElement).toHaveClass(
      "h-7",
      "select-none",
      "border-b",
      "border-border",
      "px-2",
    );
  });

  it("keeps pending Approve and Reject after switching History and back", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION, OTHER_CONVERSATION]);
    listMessages.mockImplementation(async (id: string) =>
      id === "c1" ? [USER_MESSAGE, ASSISTANT_MESSAGE] : [],
    );
    let onTurn:
      | ((payload: {
          conversation_id: string;
          assistant_text: string;
          pending: AssistantToolCall[];
        }) => void)
      | undefined;
    subscribeAssistantTurn.mockImplementation(async (handler) => {
      onTurn = handler;
      return () => {};
    });

    renderAssistant(true);
    await screen.findByText("You");
    await waitFor(() => {
      expect(onTurn).toBeTypeOf("function");
    });
    act(() => {
      onTurn?.({
        conversation_id: "c1",
        assistant_text: ASSISTANT_MESSAGE.content,
        pending: [PENDING_WRITE],
      });
    });
    expect(screen.getByRole("button", { name: "Approve" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "History" }));
    await user.click(await screen.findByRole("menuitem", { name: "Other" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    });

    await user.click(screen.getByRole("button", { name: "History" }));
    await user.click(await screen.findByRole("menuitem", { name: "Hello" }));

    expect(await screen.findByRole("button", { name: "Approve" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reject" })).toBeVisible();
  });

  it("shows the You kicker as soon as send accepts", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    listMessages.mockResolvedValue([]);
    sendMessage.mockResolvedValue({ accepted: true });

    renderAssistant(true);
    const composer = await screen.findByRole("textbox", { name: "Message" });
    await user.type(composer, "List the files");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("You")).toBeVisible();
    expect(screen.getByText("List the files")).toHaveClass("select-text");
    expect(screen.queryByText("Assistant")).toBeNull();
  });

  it("restores the composer when send fails", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    sendMessage.mockRejectedValue(new Error("offline"));

    renderAssistant(true);
    const composer = await screen.findByRole("textbox", { name: "Message" });
    await user.type(composer, "keep this draft");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
    });
    expect(composer).toHaveValue("keep this draft");
    expect(screen.queryByText("You")).toBeNull();
  });
});
