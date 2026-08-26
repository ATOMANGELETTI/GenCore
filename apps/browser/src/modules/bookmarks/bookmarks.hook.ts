import * as React from "react";
import { loadBookmarks, saveBookmarks } from "../ipc/ipc.browser-store";
import type { Bookmark, BookmarksApi, BookmarksDocumentV1 } from "./bookmarks.types";

const SAVE_DEBOUNCE_MS = 400;

function parseDocument(json: string): Bookmark[] {
  try {
    const parsed = JSON.parse(json) as Partial<BookmarksDocumentV1>;
    if (parsed.version === 1 && Array.isArray(parsed.bookmarks)) {
      return parsed.bookmarks as Bookmark[];
    }
  } catch {
    // fall through to empty
  }
  return [];
}

function serializeDocument(bookmarks: readonly Bookmark[]): string {
  const doc: BookmarksDocumentV1 = { version: 1, bookmarks };
  return JSON.stringify(doc);
}

export function useBookmarks(): BookmarksApi {
  const [bookmarks, setBookmarks] = React.useState<Bookmark[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    void loadBookmarks()
      .then((json) => {
        if (!cancelled) {
          setBookmarks(parseDocument(json));
        }
      })
      .catch(() => {
        // No persisted bookmarks yet (or IPC unavailable) — start empty.
      })
      .finally(() => {
        if (!cancelled) {
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!loaded) {
      return;
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveBookmarks(serializeDocument(bookmarks)).catch(() => {
        // IPC unavailable — bookmarks stay in memory for this session only.
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
  }, [bookmarks, loaded]);

  const isBookmarked = React.useCallback(
    (url: string) => bookmarks.some((b) => b.url === url),
    [bookmarks],
  );

  const addBookmark = React.useCallback((url: string, title: string) => {
    setBookmarks((prev) =>
      prev.some((b) => b.url === url)
        ? prev
        : [...prev, { id: crypto.randomUUID(), url, title: title || url, createdAtMs: Date.now() }],
    );
  }, []);

  const removeBookmark = React.useCallback((url: string) => {
    setBookmarks((prev) => prev.filter((b) => b.url !== url));
  }, []);

  const toggleBookmark = React.useCallback(
    (url: string, title: string) => {
      if (isBookmarked(url)) {
        removeBookmark(url);
      } else {
        addBookmark(url, title);
      }
    },
    [isBookmarked, addBookmark, removeBookmark],
  );

  return { bookmarks, loaded, isBookmarked, addBookmark, removeBookmark, toggleBookmark };
}
