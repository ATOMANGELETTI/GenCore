import { Button, Input, Tooltip, TooltipContent, TooltipTrigger } from "@gencore/ui-kit";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import * as React from "react";
import type { FindInPageApi } from "./find-in-page.hook";

interface FindInPageBarProps {
  readonly find: FindInPageApi;
}

export function FindInPageBar({ find }: FindInPageBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (find.open) {
      inputRef.current?.focus();
    }
  }, [find.open]);

  if (!find.open) {
    return null;
  }

  return (
    <div
      data-slot="find-in-page-bar"
      className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border border-border bg-popover p-1 shadow-lg"
    >
      <Input
        ref={inputRef}
        value={find.query}
        onChange={(event) => find.setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            if (event.shiftKey) {
              find.findPrevious();
            } else {
              find.findNext();
            }
          } else if (event.key === "Escape") {
            find.closeFind();
          }
        }}
        placeholder="Find in page"
        className="h-7 w-48 text-xs"
        aria-label="Find in page"
      />
      <IconButton label="Previous match" onClick={find.findPrevious}>
        <ChevronUp />
      </IconButton>
      <IconButton label="Next match" onClick={find.findNext}>
        <ChevronDown />
      </IconButton>
      <IconButton label="Close" onClick={find.closeFind}>
        <X />
      </IconButton>
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
