import { Input } from "@gencore/ui-kit";
import { Search } from "lucide-react";
import * as React from "react";

interface NewTabPageProps {
  onNavigate: (input: string) => void;
}

export function NewTabPage({ onNavigate }: NewTabPageProps) {
  const [query, setQuery] = React.useState("");

  function submit() {
    const trimmed = query.trim();
    if (trimmed) {
      onNavigate(trimmed);
    }
  }

  return (
    <div
      data-slot="new-tab-page"
      className="flex h-full w-full flex-col items-center justify-center gap-6 bg-background"
    >
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-nord-frost-10/15 text-nord-frost-9">
          <CompassGlyph />
        </div>
        <h1 className="text-lg font-medium text-foreground">GenCore Browser</h1>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submit();
            }
          }}
          placeholder="Search or enter address"
          className="h-11 rounded-full pl-10 text-sm"
          aria-label="Search or enter address"
        />
      </div>
    </div>
  );
}

function CompassGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 9l-4 4-2-2 6-2z" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
