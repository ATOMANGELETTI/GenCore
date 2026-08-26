import { Button } from "@gencore/ui-kit";
import { Star, Trash2 } from "lucide-react";
import { hostnameOf } from "../navigation-bar/navigation-bar.omnibox";
import type { Bookmark } from "./bookmarks.types";

interface BookmarksPanelProps {
  readonly bookmarks: readonly Bookmark[];
  onOpen: (url: string) => void;
  onRemove: (url: string) => void;
}

export function BookmarksPanel({ bookmarks, onOpen, onRemove }: BookmarksPanelProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
        <Star className="size-5 opacity-50" />
        <p>Bookmarked pages appear here.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5 overflow-y-auto p-1.5">
      {[...bookmarks].reverse().map((bookmark) => (
        <li
          key={bookmark.id}
          className="group flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
        >
          <button
            type="button"
            onClick={() => onOpen(bookmark.url)}
            className="flex min-w-0 flex-1 flex-col items-start text-left"
          >
            <span className="w-full truncate text-xs font-medium text-foreground">
              {bookmark.title}
            </span>
            <span className="w-full truncate text-[11px] text-muted-foreground">
              {hostnameOf(bookmark.url)}
            </span>
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove bookmark"
            className="shrink-0 opacity-0 group-hover:opacity-100"
            onClick={() => onRemove(bookmark.url)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
