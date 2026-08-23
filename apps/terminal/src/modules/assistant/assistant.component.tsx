import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Separator,
} from "@gencore/ui-kit";
import { History, Plus } from "lucide-react";
import * as React from "react";
import type { AssistantToolCall } from "../ipc/ipc.types";
import { useAssistant } from "./assistant.hook";

const KICKER_CLASS = "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

function commandFromArgs(argsJson: string): string {
  try {
    const parsed = JSON.parse(argsJson) as { data?: unknown };
    if (typeof parsed.data === "string") {
      return parsed.data;
    }
  } catch {
    // Show the raw payload when it is not a pty_write data object.
  }
  return argsJson;
}

function PendingGroup({
  call,
  onConfirm,
  onReject,
}: {
  call: AssistantToolCall;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="mx-2 mb-2 overflow-hidden rounded-sm border border-border bg-background">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <div className="min-w-0">
          <p className="text-xs">PTY write</p>
          <p className="text-[10px] text-muted-foreground">Tab · pending</p>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-success"
            onClick={() => {
              onConfirm(call.id);
            }}
          >
            Approve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              onReject(call.id);
            }}
          >
            Reject
          </Button>
        </div>
      </div>
      <p className="border-t border-border px-2 py-1 font-mono text-[10px]">
        {commandFromArgs(call.args_json)}
      </p>
    </div>
  );
}

export function Assistant() {
  const assistant = useAssistant();
  const turns = assistant.messages.filter(
    (message) => message.role === "user" || message.role === "assistant",
  );
  if (assistant.streaming && assistant.streamText) {
    turns.push({
      id: "__stream__",
      conversation_id: assistant.conversationId ?? "",
      role: "assistant",
      content: assistant.streamText,
      created_at: 0,
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-7 select-none items-center justify-between border-b border-border px-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          ASSISTANT
        </span>
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label="History">
                <History aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {assistant.conversations.map((conversation) => (
                <DropdownMenuItem
                  key={conversation.id}
                  onSelect={() => {
                    assistant.selectConversation(conversation.id);
                  }}
                >
                  {conversation.title || "New chat"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="New chat"
            onClick={() => {
              void assistant.newChat();
            }}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!assistant.hasApiKey ? (
          <div className="flex h-full items-center justify-center px-3">
            <p className="text-sm text-muted-foreground">
              Set a Gemini API key in Config to start chatting.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {turns.map((message, index) => (
              <React.Fragment key={message.id}>
                {index > 0 ? <Separator /> : null}
                <div className="px-2 py-1.5">
                  <p
                    className={
                      message.role === "assistant" ? `${KICKER_CLASS} text-primary` : KICKER_CLASS
                    }
                  >
                    {message.role === "user" ? "You" : "Assistant"}
                  </p>
                  <p className="select-text text-xs">{message.content}</p>
                </div>
              </React.Fragment>
            ))}
            {assistant.pending.map((call) => (
              <PendingGroup
                key={call.id}
                call={call}
                onConfirm={(id) => {
                  void assistant.confirmPending(id);
                }}
                onReject={(id) => {
                  void assistant.rejectPending(id);
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-border p-1.5">
        <Input
          aria-label="Message"
          value={assistant.composer}
          disabled={!assistant.hasApiKey || assistant.streaming}
          className="h-5"
          onChange={(event) => {
            assistant.setComposer(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void assistant.send();
            }
          }}
        />
      </div>
    </div>
  );
}
