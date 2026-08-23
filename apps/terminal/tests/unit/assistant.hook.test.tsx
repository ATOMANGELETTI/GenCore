import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMemo, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileTreeApi } from "../../src/modules/file-tree/file-tree.hook";
import { FileTreeApiStubProvider } from "../../src/modules/file-tree/file-tree.hook";
import type {
  AssistantMessage,
  AssistantToolCall,
  AssistantUiActionPayload,
  Conversation,
} from "../../src/modules/ipc/ipc.types";
import { TerminalSessionStubProvider } from "../../src/modules/terminal/terminal.hook";
import type { TerminalSessionApi } from "../../src/modules/terminal/terminal.types";

const {
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  cancelTurn,
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
  cancelTurn: vi.fn(),
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
  cancelTurn,
  confirmAction,
  rejectAction,
  subscribeAssistantToken,
  subscribeAssistantTurn,
  subscribeAssistantError,
  subscribeAssistantUiAction,
}));

import {
  AgentSettingsStubProvider,
  applyAssistantUiAction,
  useAssistant,
} from "../../src/modules/assistant/assistant.hook";

/** What `buildSnapshot` produces with no `<TerminalProvider>`/`<FileTreeProvider>` ancestor. */
const EMPTY_SNAPSHOT = {
  active_tab_id: "",
  output_excerpt: "",
  tabs: [],
};

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
      <span data-testid="error-message">{assistant.error?.message ?? ""}</span>
      <span data-testid="error-code">{assistant.error?.code ?? ""}</span>
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
      <button type="button" onClick={() => void assistant.cancel()}>
        cancel
      </button>
    </div>
  );
}

function mockIdleIpc() {
  listConversations.mockResolvedValue([]);
  createConversation.mockResolvedValue(CONVERSATION);
  listMessages.mockResolvedValue({ messages: [], pending: [] });
  sendMessage.mockResolvedValue({ accepted: true });
  cancelTurn.mockResolvedValue(undefined);
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

function fakeTerminalSession(overrides: Partial<TerminalSessionApi> = {}): TerminalSessionApi {
  return {
    tabs: [],
    activeId: "",
    cols: 80,
    rows: 24,
    shellName: "pwsh",
    newTab: vi.fn(),
    closeTab: vi.fn(),
    setActive: vi.fn(),
    renameTab: vi.fn(),
    togglePin: vi.fn(),
    closeOthers: vi.fn(),
    closeUnpinned: vi.fn(),
    restartTab: vi.fn(),
    setViewport: vi.fn(),
    registerWriter: vi.fn(() => () => undefined),
    registerSerializer: vi.fn(() => () => undefined),
    registerClipboard: vi.fn(() => () => undefined),
    readScrollback: () => "",
    onTerminalInput: vi.fn(),
    clipboard: {
      hasSelection: () => false,
      copy: async () => undefined,
      paste: async () => undefined,
      selectAll: () => undefined,
    },
    flushPinnedSave: async () => undefined,
    ...overrides,
  };
}

function fakeFileTreeApi(overrides: Partial<FileTreeApi> = {}): FileTreeApi {
  return {
    rows: [],
    nodes: {},
    selectedId: null,
    create: null,
    refreshing: false,
    onSelect: vi.fn(),
    onToggle: vi.fn(),
    startCreate: vi.fn(async () => undefined),
    commitCreate: vi.fn(async () => undefined),
    cancelCreate: vi.fn(),
    collapseAll: vi.fn(),
    refresh: vi.fn(async () => undefined),
    refreshPath: vi.fn(async () => undefined),
    revealPath: vi.fn(),
    ...overrides,
  };
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

  it("sends an empty snapshot when no terminal session or files selection is available", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    renderHookProbe(true);

    await waitFor(() => {
      expect(listConversations).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText("composer"), "hello");
    await user.click(screen.getByText("send"));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith("c1", "hello", EMPTY_SNAPSHOT);
    });
  });

  it("sends a real snapshot built from the terminal session and files selection", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    const terminalSession = fakeTerminalSession({
      tabs: [
        {
          id: "t1",
          name: "Build",
          pinned: false,
          cwd: "C:\\work",
          sessionId: "sess-1",
          status: "live",
          error: null,
        },
      ],
      activeId: "t1",
      readScrollback: () => "line1\nline2",
    });
    const fileTreeApi = fakeFileTreeApi({
      selectedId: "C:\\work\\app.rs",
      nodes: {
        "C:\\work\\app.rs": {
          name: "app.rs",
          path: "C:\\work\\app.rs",
          kind: "file",
          extension: "rs",
          hidden: false,
          system: false,
          label: null,
          expanded: false,
          children: [],
        },
      },
    });

    render(
      <TerminalSessionStubProvider value={terminalSession}>
        <FileTreeApiStubProvider value={fileTreeApi}>
          <AgentSettingsStubProvider hasApiKey={true}>
            <Probe />
          </AgentSettingsStubProvider>
        </FileTreeApiStubProvider>
      </TerminalSessionStubProvider>,
    );

    await waitFor(() => {
      expect(listConversations).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText("composer"), "hello");
    await user.click(screen.getByText("send"));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith("c1", "hello", {
        active_tab_id: "t1",
        active_session_id: "sess-1",
        cwd: "C:\\work",
        output_excerpt: "line1\nline2",
        tabs: [{ id: "t1", name: "Build", cwd: "C:\\work", pinned: false }],
        files_selection: { path: "C:\\work\\app.rs", kind: "file" },
      });
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

  const PENDING_TOOL_CALL: AssistantToolCall = {
    id: "tool-1",
    conversation_id: "c1",
    message_id: "m1",
    name: "pty_write",
    args_json: "{}",
    status: "pending",
    result_json: null,
    created_at: 1,
    resolved_at: null,
  };

  type TurnHandler = (payload: {
    conversation_id: string;
    assistant_text: string;
    pending: { id: string; status: string }[];
  }) => void;

  async function renderWithOnePending(): Promise<{
    user: ReturnType<typeof userEvent.setup>;
    fireTurn: TurnHandler;
  }> {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION, OTHER_CONVERSATION]);
    // Mirrors what a real `list_messages` would return once the turn below
    // has persisted this pending tool_call, so the hook's post-turn refetch
    // (Important 2) does not stomp the optimistic pending state with stale
    // data — see `confirmPending`/`rejectPending` covering tests below.
    listMessages.mockResolvedValue({ messages: [], pending: [PENDING_TOOL_CALL] });
    let onTurn: TurnHandler | undefined;
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

    return {
      user,
      fireTurn: (payload) => onTurn?.(payload),
    };
  }

  it("confirmPending drops the pending row and marks the conversation streaming immediately (Critical 1)", async () => {
    const { user } = await renderWithOnePending();

    await user.click(screen.getByText("approve"));

    await waitFor(() => {
      expect(confirmAction).toHaveBeenCalledWith("tool-1");
    });
    // No `://turn` event fires in this test — the drop and the streaming
    // flag must come from the confirm call succeeding, not from a turn event.
    await waitFor(() => {
      expect(screen.getByTestId("pending-count")).toHaveTextContent("0");
    });
    expect(screen.getByTestId("streaming")).toHaveTextContent("true");
  });

  it("rejectPending drops the pending row and marks the conversation streaming immediately (Critical 1)", async () => {
    const { user } = await renderWithOnePending();

    await user.click(screen.getByText("reject"));

    await waitFor(() => {
      expect(rejectAction).toHaveBeenCalledWith("tool-1");
    });
    await waitFor(() => {
      expect(screen.getByTestId("pending-count")).toHaveTextContent("0");
    });
    expect(screen.getByTestId("streaming")).toHaveTextContent("true");
  });

  it("keeps the pending card and records an error when confirmAction rejects", async () => {
    confirmAction.mockRejectedValue(new Error("PtySessionGone"));
    const { user } = await renderWithOnePending();

    await user.click(screen.getByText("approve"));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toHaveTextContent("PtySessionGone");
    });
    expect(screen.getByTestId("pending-count")).toHaveTextContent("1");
    expect(screen.getByTestId("streaming")).toHaveTextContent("false");
  });

  it("keeps the pending card and records an error when rejectAction rejects", async () => {
    rejectAction.mockRejectedValue(new Error("ActionNotPending"));
    const { user } = await renderWithOnePending();

    await user.click(screen.getByText("reject"));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toHaveTextContent("ActionNotPending");
    });
    expect(screen.getByTestId("pending-count")).toHaveTextContent("1");
  });

  it("a later turn event still replaces pending with payload.pending after a confirm", async () => {
    const { user, fireTurn } = await renderWithOnePending();

    await user.click(screen.getByText("approve"));
    await waitFor(() => {
      expect(screen.getByTestId("pending-count")).toHaveTextContent("0");
    });

    // The refetch this turn triggers must reflect the same persisted state,
    // or it would stomp `payload.pending` right back out.
    listMessages.mockResolvedValue({
      messages: [],
      pending: [{ ...PENDING_TOOL_CALL, id: "tool-2" }],
    });
    fireTurn({
      conversation_id: "c1",
      assistant_text: "follow-up",
      pending: [{ id: "tool-2", status: "pending" }],
    });

    await waitFor(() => {
      expect(screen.getByTestId("pending-count")).toHaveTextContent("1");
    });
  });

  it("hydrates pending tool calls from list_messages when selecting a conversation", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION, OTHER_CONVERSATION]);
    listMessages.mockImplementation((id: string) =>
      Promise.resolve({
        messages: [],
        pending:
          id === "c1"
            ? [
                {
                  id: "tool-1",
                  conversation_id: "c1",
                  message_id: "m1",
                  name: "pty_write",
                  args_json: "{}",
                  status: "pending",
                  result_json: null,
                  created_at: 1,
                  resolved_at: null,
                },
              ]
            : [],
      }),
    );

    renderHookProbe(true);
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c1");
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
      expect(sendMessage).toHaveBeenCalledWith("c1", "hello", EMPTY_SNAPSHOT);
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

  it("does not let a delayed empty listMessages result wipe the You row on a brand-new chat", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([]);
    createConversation.mockResolvedValue(CONVERSATION);
    let resolveList: ((value: { messages: never[]; pending: never[] }) => void) | undefined;
    listMessages.mockImplementation(
      () =>
        new Promise<{ messages: never[]; pending: never[] }>((resolve) => {
          resolveList = resolve;
        }),
    );
    sendMessage.mockResolvedValue({ accepted: true });

    renderHookProbe(true);
    await waitFor(() => {
      expect(listConversations).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText("composer"), "hello");
    await user.click(screen.getByText("send"));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith("c1", "hello", EMPTY_SNAPSHOT);
    });
    await waitFor(() => {
      const userTurn = screen.getByTestId("messages").querySelector("[data-role='user']");
      expect(userTurn).toHaveTextContent("hello");
    });

    // The listMessages() fired when the new conversation id was set settles
    // only now, well after the You row was appended.
    resolveList?.({ messages: [], pending: [] });
    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith("c1");
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const userTurn = screen.getByTestId("messages").querySelector("[data-role='user']");
    expect(userTurn).toHaveTextContent("hello");
  });

  it("keeps the new chat's composer draft and messages safe from a stale send and turn on the old chat", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION, OTHER_CONVERSATION]);

    let resolveSend: ((value: { accepted: boolean }) => void) | undefined;
    sendMessage.mockImplementation(
      () =>
        new Promise<{ accepted: boolean }>((resolve) => {
          resolveSend = resolve;
        }),
    );

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

    const pendingC1Resolvers: Array<
      (value: { messages: AssistantMessage[]; pending: AssistantToolCall[] }) => void
    > = [];
    listMessages.mockImplementation((conversationId: string) => {
      if (conversationId === "c1") {
        return new Promise<{ messages: AssistantMessage[]; pending: AssistantToolCall[] }>(
          (resolve) => {
            pendingC1Resolvers.push(resolve);
          },
        );
      }
      return Promise.resolve({ messages: [], pending: [] });
    });

    renderHookProbe(true);
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c1");
      expect(onTurn).toBeTypeOf("function");
    });

    await user.type(screen.getByLabelText("composer"), "hello from c1");
    await user.click(screen.getByText("send"));
    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith("c1", "hello from c1", EMPTY_SNAPSHOT);
    });

    // History switch while the c1 send is still awaiting.
    await user.click(screen.getByText("select-c2"));
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c2");
    });

    await user.clear(screen.getByLabelText("composer"));
    await user.type(screen.getByLabelText("composer"), "draft for c2");
    expect(screen.getByLabelText("composer")).toHaveValue("draft for c2");

    // The old chat's send finally accepts...
    resolveSend?.({ accepted: true });
    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(1);
    });
    // ...followed by a turn event for the old chat, which kicks off a stale
    // listMessages(c1) fetch.
    onTurn?.({ conversation_id: "c1", assistant_text: "ok", pending: [] });
    await waitFor(() => {
      expect(pendingC1Resolvers.length).toBeGreaterThan(1);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByLabelText("composer")).toHaveValue("draft for c2");
    expect(screen.getByTestId("messages")).toBeEmptyDOMElement();

    // The stale turn's listMessages(c1) settles after everything above.
    pendingC1Resolvers[pendingC1Resolvers.length - 1]?.({
      messages: [
        { id: "m1", conversation_id: "c1", role: "user", content: "hello from c1", created_at: 1 },
      ],
      pending: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByLabelText("composer")).toHaveValue("draft for c2");
    expect(screen.getByTestId("messages")).toBeEmptyDOMElement();
  });

  it("does not leave chat A's transcript on screen after History-selecting chat B, even when B's fetch fails", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION, OTHER_CONVERSATION]);
    listMessages.mockImplementation((id: string) =>
      id === "c2"
        ? Promise.reject(new Error("network down"))
        : Promise.resolve({ messages: [], pending: [] }),
    );

    renderHookProbe(true);
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c1");
    });

    await user.type(screen.getByLabelText("composer"), "hello from c1");
    await user.click(screen.getByText("send"));
    await waitFor(() => {
      const userTurn = screen.getByTestId("messages").querySelector("[data-role='user']");
      expect(userTurn).toHaveTextContent("hello from c1");
    });

    await user.click(screen.getByText("select-c2"));
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c2");
    });
    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith("c2");
    });
    // Let the rejected listMessages("c2") settle; its .catch must not leave
    // chat A's rows on screen under chat B's id.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByTestId("messages").querySelector("[data-role='user']")).toBeNull();
    expect(screen.getByTestId("messages")).toBeEmptyDOMElement();
  });

  it("records a { code, message } error and clears streaming when gencore-assistant://error fires (Important 3)", async () => {
    listConversations.mockResolvedValue([CONVERSATION]);
    let onError:
      | ((payload: { conversation_id: string; code: string; message: string }) => void)
      | undefined;
    subscribeAssistantError.mockImplementation(async (handler) => {
      onError = handler;
      return () => {};
    });

    renderHookProbe(true);
    await waitFor(() => {
      expect(onError).toBeTypeOf("function");
    });

    onError?.({ conversation_id: "c1", code: "NoApiKey", message: "no key stored" });

    await waitFor(() => {
      expect(screen.getByTestId("error-code")).toHaveTextContent("NoApiKey");
    });
    expect(screen.getByTestId("error-message")).toHaveTextContent("no key stored");
    expect(screen.getByTestId("streaming")).toHaveTextContent("false");
  });

  it("clears a recorded error once a token or turn event lands for that conversation", async () => {
    listConversations.mockResolvedValue([CONVERSATION]);
    let onError:
      | ((payload: { conversation_id: string; code: string; message: string }) => void)
      | undefined;
    subscribeAssistantError.mockImplementation(async (handler) => {
      onError = handler;
      return () => {};
    });
    let onToken: ((payload: { conversation_id: string; text: string }) => void) | undefined;
    subscribeAssistantToken.mockImplementation(async (handler) => {
      onToken = handler;
      return () => {};
    });

    renderHookProbe(true);
    await waitFor(() => {
      expect(onError).toBeTypeOf("function");
      expect(onToken).toBeTypeOf("function");
    });

    onError?.({ conversation_id: "c1", code: "Gemini", message: "boom" });
    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toHaveTextContent("boom");
    });

    onToken?.({ conversation_id: "c1", text: "hi" });
    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toHaveTextContent("");
    });
  });

  it("records an error when send rejects", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    sendMessage.mockRejectedValue(new Error("network down"));
    renderHookProbe(true);
    await waitFor(() => {
      expect(listConversations).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText("composer"), "hello");
    await user.click(screen.getByText("send"));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toHaveTextContent("network down");
    });
  });

  it("cancel() calls cancelTurn for the active conversation (Important 4)", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    renderHookProbe(true);
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c1");
    });

    await user.click(screen.getByText("cancel"));

    await waitFor(() => {
      expect(cancelTurn).toHaveBeenCalledWith("c1");
    });
  });

  it("cancel() clears streaming for that conversation so the composer is usable again", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION]);
    let onToken: ((payload: { conversation_id: string; text: string }) => void) | undefined;
    subscribeAssistantToken.mockImplementation(async (handler) => {
      onToken = handler;
      return () => {};
    });

    renderHookProbe(true);
    await waitFor(() => {
      expect(onToken).toBeTypeOf("function");
    });

    onToken?.({ conversation_id: "c1", text: "thinking" });
    await waitFor(() => {
      expect(screen.getByTestId("streaming")).toHaveTextContent("true");
    });

    await user.click(screen.getByText("cancel"));

    await waitFor(() => {
      expect(cancelTurn).toHaveBeenCalledWith("c1");
    });
    await waitFor(() => {
      expect(screen.getByTestId("streaming")).toHaveTextContent("false");
    });
  });

  it("keeps confirm streaming on the tool's conversation if History changes before confirm resolves", async () => {
    let resolveConfirm: (value: { name: string; result_json: string; ui_action: null }) => void =
      () => undefined;
    confirmAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const { user } = await renderWithOnePending();

    await user.click(screen.getByText("approve"));
    await user.click(screen.getByText("select-c2"));
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c2");
    });

    listMessages.mockResolvedValue({ messages: [], pending: [] });
    resolveConfirm({ name: "pty_write", result_json: "{}", ui_action: null });

    await user.click(screen.getByText("select-c1"));
    await waitFor(() => {
      expect(screen.getByTestId("pending-count")).toHaveTextContent("0");
    });
    expect(screen.getByTestId("streaming")).toHaveTextContent("true");

    await user.click(screen.getByText("select-c2"));
    expect(screen.getByTestId("streaming")).toHaveTextContent("false");
  });

  it("keys composer drafts by conversation: switching chats swaps drafts instead of sharing them (Important 10)", async () => {
    const user = userEvent.setup();
    listConversations.mockResolvedValue([CONVERSATION, OTHER_CONVERSATION]);
    renderHookProbe(true);
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c1");
    });

    await user.type(screen.getByLabelText("composer"), "draft for c1");
    expect(screen.getByLabelText("composer")).toHaveValue("draft for c1");

    await user.click(screen.getByText("select-c2"));
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c2");
    });
    expect(screen.getByLabelText("composer")).toHaveValue("");

    await user.type(screen.getByLabelText("composer"), "draft for c2");
    expect(screen.getByLabelText("composer")).toHaveValue("draft for c2");

    await user.click(screen.getByText("select-c1"));
    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("c1");
    });
    expect(screen.getByLabelText("composer")).toHaveValue("draft for c1");
  });

  it("switches tabs and reveals a path when a ui-action fires after confirm", async () => {
    let onUiAction: ((payload: AssistantUiActionPayload) => void) | undefined;
    subscribeAssistantUiAction.mockImplementation(async (handler) => {
      onUiAction = handler;
      return () => {};
    });
    const terminalSession = fakeTerminalSession();
    const fileTreeApi = fakeFileTreeApi();

    render(
      <TerminalSessionStubProvider value={terminalSession}>
        <FileTreeApiStubProvider value={fileTreeApi}>
          <AgentSettingsStubProvider hasApiKey={true}>
            <Probe />
          </AgentSettingsStubProvider>
        </FileTreeApiStubProvider>
      </TerminalSessionStubProvider>,
    );

    await waitFor(() => {
      expect(onUiAction).toBeTypeOf("function");
    });

    onUiAction?.({ id: "call-1", name: "switch_tab", args: { tab_id: "tab-2" } });
    expect(terminalSession.setActive).toHaveBeenCalledWith("tab-2");

    onUiAction?.({ id: "call-2", name: "reveal_in_files", args: { path: "C:\\work\\app.rs" } });
    expect(fileTreeApi.revealPath).toHaveBeenCalledWith("C:\\work\\app.rs");
  });

  it("subscribes to ui-action once even as the terminal session and file tree objects change identity", async () => {
    const user = userEvent.setup();
    let onUiAction: ((payload: AssistantUiActionPayload) => void) | undefined;
    subscribeAssistantUiAction.mockImplementation(async (handler) => {
      onUiAction = handler;
      return () => {};
    });

    // Mirrors <TerminalProvider>/<FileTreeProvider>, which memoize their
    // context value off state that changes on nearly every render (tab
    // output, tree listings, ...), so each bump hands the Assistant a
    // brand-new object with the same shape.
    function Wrapper() {
      const [tick, setTick] = useState(0);
      const terminalSession = useMemo(
        () => fakeTerminalSession({ activeId: String(tick) }),
        [tick],
      );
      const fileTreeApi = useMemo(() => fakeFileTreeApi({ selectedId: String(tick) }), [tick]);
      return (
        <TerminalSessionStubProvider value={terminalSession}>
          <FileTreeApiStubProvider value={fileTreeApi}>
            <AgentSettingsStubProvider hasApiKey={true}>
              <Probe />
              <button type="button" onClick={() => setTick((current) => current + 1)}>
                bump
              </button>
            </AgentSettingsStubProvider>
          </FileTreeApiStubProvider>
        </TerminalSessionStubProvider>
      );
    }

    render(<Wrapper />);

    await waitFor(() => {
      expect(onUiAction).toBeTypeOf("function");
    });
    expect(subscribeAssistantUiAction).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText("bump"));
    await user.click(screen.getByText("bump"));
    await user.click(screen.getByText("bump"));

    // Still the same listener registered at mount: no teardown/resubscribe,
    // so a confirm-triggered event fired mid-bump can never be dropped.
    expect(subscribeAssistantUiAction).toHaveBeenCalledTimes(1);
    onUiAction?.({ id: "call-3", name: "switch_tab", args: { tab_id: "tab-9" } });
  });
});

describe("applyAssistantUiAction", () => {
  it("calls setActive with args.tab_id for switch_tab", () => {
    const setActive = vi.fn();
    applyAssistantUiAction(
      { id: "1", name: "switch_tab", args: { tab_id: "tab-2" } },
      { setActive },
    );
    expect(setActive).toHaveBeenCalledWith("tab-2");
  });

  it("calls revealPath with args.path for reveal_in_files", () => {
    const revealPath = vi.fn();
    applyAssistantUiAction(
      { id: "1", name: "reveal_in_files", args: { path: "C:\\repo" } },
      { revealPath },
    );
    expect(revealPath).toHaveBeenCalledWith("C:\\repo");
  });

  it("is a no-op for an unknown action name", () => {
    const setActive = vi.fn();
    const revealPath = vi.fn();
    applyAssistantUiAction({ id: "1", name: "pty_write", args: {} }, { setActive, revealPath });
    expect(setActive).not.toHaveBeenCalled();
    expect(revealPath).not.toHaveBeenCalled();
  });

  it("is a no-op when args are missing or malformed", () => {
    const setActive = vi.fn();
    const revealPath = vi.fn();
    applyAssistantUiAction({ id: "1", name: "switch_tab", args: null }, { setActive });
    applyAssistantUiAction({ id: "2", name: "switch_tab", args: { tab_id: 5 } }, { setActive });
    applyAssistantUiAction({ id: "3", name: "reveal_in_files", args: {} }, { revealPath });
    expect(setActive).not.toHaveBeenCalled();
    expect(revealPath).not.toHaveBeenCalled();
  });

  it("does not throw when the matching handler is not provided", () => {
    expect(() => {
      applyAssistantUiAction({ id: "1", name: "switch_tab", args: { tab_id: "t1" } }, {});
    }).not.toThrow();
  });
});
