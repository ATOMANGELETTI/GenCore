import { Button, cn, Input, Separator } from "@gencore/ui-kit";
import { Check } from "lucide-react";
import * as React from "react";
import { useAgentSettings } from "../config.agent";
import {
  AGENT_MODELS,
  MAX_CONTEXT_LINES,
  MIN_CONTEXT_LINES,
  nextRadioIndex,
  parseContextLines,
  SECTION_LABEL_CLASS,
} from "../config.constants";

export function AssistantView() {
  const agent = useAgentSettings();
  const modelRadioRefs = React.useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const [keyDraft, setKeyDraft] = React.useState("");
  const [replacing, setReplacing] = React.useState(false);
  const [contextDraft, setContextDraft] = React.useState(() => String(agent.contextLines));

  React.useEffect(() => {
    setContextDraft(String(agent.contextLines));
  }, [agent.contextLines]);

  function onModelKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, model: string) {
    const currentIndex = AGENT_MODELS.indexOf(model as (typeof AGENT_MODELS)[number]);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = nextRadioIndex(event.key, currentIndex, AGENT_MODELS.length);
    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const next = AGENT_MODELS[nextIndex];
    if (next) {
      agent.setModel(next);
      modelRadioRefs.current[next]?.focus();
    }
  }

  async function handleSaveKey() {
    const trimmed = keyDraft.trim();
    if (!trimmed) {
      return;
    }
    const saved = await agent.saveKey(trimmed);
    if (saved) {
      setKeyDraft("");
      setReplacing(false);
    }
  }

  function handleReplaceKey() {
    agent.replaceKey();
    setReplacing(true);
  }

  function handleCancelReplace() {
    setReplacing(false);
    setKeyDraft("");
  }

  function handleContextChange(value: string) {
    setContextDraft(value);
    const parsed = parseContextLines(value);
    if (parsed === undefined) {
      return;
    }
    agent.setContextLines(parsed);
  }

  return (
    <div data-slot="assistant-view">
      <p className={SECTION_LABEL_CLASS}>Assistant</p>
      <div className="overflow-hidden rounded-sm border border-border bg-background">
        {agent.hasApiKey && !replacing ? (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="min-w-0">
              <p className="text-xs text-primary">Gemini API key</p>
              <p className="text-[10px] text-muted-foreground">Key saved · Windows DPAPI</p>
            </div>
            <div className="flex shrink-0 items-center">
              <Button variant="ghost" size="sm" onClick={handleReplaceKey}>
                Replace
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  void agent.clearKey();
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              aria-label="Gemini API key"
              placeholder="Gemini API key"
              value={keyDraft}
              className="h-5 min-w-0 flex-1"
              onChange={(event) => {
                setKeyDraft(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSaveKey();
                }
              }}
            />
            <Button
              size="sm"
              disabled={!keyDraft.trim()}
              onClick={() => {
                void handleSaveKey();
              }}
            >
              Save
            </Button>
            {replacing ? (
              <Button variant="ghost" size="sm" onClick={handleCancelReplace}>
                Cancel
              </Button>
            ) : null}
          </div>
        )}
        <Separator />
        <div role="radiogroup" aria-label="Model">
          {AGENT_MODELS.map((model, index) => {
            const isSelected = agent.model === model;

            return (
              <React.Fragment key={model}>
                {index > 0 ? <Separator /> : null}
                <Button
                  ref={(node) => {
                    modelRadioRefs.current[model] = node;
                  }}
                  type="button"
                  role="radio"
                  variant="ghost"
                  aria-checked={isSelected}
                  aria-label={model}
                  tabIndex={isSelected ? 0 : -1}
                  className={cn(
                    "h-auto w-full justify-between rounded-none px-2 py-1.5",
                    isSelected
                      ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={() => {
                    agent.setModel(model);
                  }}
                  onKeyDown={(event) => {
                    onModelKeyDown(event, model);
                  }}
                >
                  <span className="text-xs font-medium">{model}</span>
                  {isSelected ? <Check aria-hidden="true" className="size-3 shrink-0" /> : null}
                </Button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <p className={SECTION_LABEL_CLASS}>Context</p>
      <div className="overflow-hidden rounded-sm border border-border bg-background">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="min-w-0">
            <p className="text-xs">Terminal lines</p>
            <p className="text-[10px] text-muted-foreground">
              {`Last ${agent.contextLines} lines with each send`}
            </p>
          </div>
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Terminal lines"
            min={MIN_CONTEXT_LINES}
            max={MAX_CONTEXT_LINES}
            value={contextDraft}
            className="h-5 w-14 shrink-0 text-right"
            onChange={(event) => {
              handleContextChange(event.target.value);
            }}
          />
        </div>
      </div>
    </div>
  );
}
