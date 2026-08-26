import { cn, Input } from "@gencore/ui-kit";
import { Lock, Star } from "lucide-react";
import * as React from "react";
import type { BrowserTab } from "../tabs/tabs.types";

interface AddressBarProps {
  readonly tab: BrowserTab | null;
  readonly isBookmarked: boolean;
  onSubmit: (value: string) => void;
  onToggleBookmark: () => void;
}

export function AddressBar({ tab, isBookmarked, onSubmit, onToggleBookmark }: AddressBarProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const url = tab?.url ?? "";
  const isSecure = url.startsWith("https://");

  React.useEffect(() => {
    if (!editing) {
      setDraft(url);
    }
  }, [url, editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed) {
      onSubmit(trimmed);
    } else {
      setDraft(url);
    }
  }

  return (
    <div
      data-slot="address-bar"
      className="relative flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 text-xs focus-within:border-nord-frost-9/60 focus-within:ring-1 focus-within:ring-nord-frost-9/30"
    >
      {url ? (
        <Lock
          className={cn(
            "size-3 shrink-0",
            isSecure ? "text-nord-aurora-14" : "text-muted-foreground",
          )}
          aria-label={isSecure ? "Secure connection" : "Not secure"}
        />
      ) : null}
      <Input
        ref={inputRef}
        value={editing ? draft : url}
        placeholder="Search or enter address"
        onFocus={() => {
          setEditing(true);
          setDraft(url);
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            inputRef.current?.blur();
          } else if (event.key === "Escape") {
            setDraft(url);
            setEditing(false);
            inputRef.current?.blur();
          }
        }}
        className="h-full flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        aria-label="Address"
      />
      {tab && url ? (
        <button
          type="button"
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
          aria-pressed={isBookmarked}
          onClick={onToggleBookmark}
          className="flex size-4 shrink-0 items-center justify-center rounded-sm hover:bg-accent"
        >
          <Star
            className={cn(
              "size-3.5",
              isBookmarked ? "fill-nord-aurora-13 text-nord-aurora-13" : "text-muted-foreground",
            )}
          />
        </button>
      ) : null}
    </div>
  );
}
