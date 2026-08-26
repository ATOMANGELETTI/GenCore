import { faviconUrlOf, hostnameOf } from "../navigation-bar/navigation-bar.omnibox";
import type { Bookmark } from "./bookmarks.types";

interface BookmarksBarProps {
  readonly bookmarks: readonly Bookmark[];
  onOpen: (url: string) => void;
}

export function BookmarksBar({ bookmarks, onOpen }: BookmarksBarProps) {
  if (bookmarks.length === 0) {
    return null;
  }

  return (
    <div
      data-slot="bookmarks-bar"
      className="flex h-7 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-muted/30 px-2"
    >
      {bookmarks.map((bookmark) => {
        const favicon = faviconUrlOf(bookmark.url);
        return (
          <button
            key={bookmark.id}
            type="button"
            onClick={() => onOpen(bookmark.url)}
            title={bookmark.url}
            className="flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] text-foreground hover:bg-accent"
          >
            {favicon ? (
              <img
                src={favicon}
                alt=""
                className="size-3 rounded-[2px]"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <span className="max-w-32 truncate">{bookmark.title || hostnameOf(bookmark.url)}</span>
          </button>
        );
      })}
    </div>
  );
}
