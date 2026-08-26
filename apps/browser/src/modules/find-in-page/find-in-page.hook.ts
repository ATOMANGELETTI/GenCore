import * as React from "react";
import { evalTabWebview } from "../ipc/ipc.webview";
import {
  clearHighlightsScript,
  highlightScript,
  nextMatchScript,
  previousMatchScript,
} from "./find-in-page.script";

const QUERY_DEBOUNCE_MS = 200;

export interface FindInPageApi {
  readonly open: boolean;
  readonly query: string;
  setQuery: (value: string) => void;
  openFind: () => void;
  closeFind: () => void;
  findNext: () => void;
  findPrevious: () => void;
}

function safeEval(label: string, script: string): void {
  evalTabWebview(label, script).catch(() => {
    // Tab webview or IPC unavailable — nothing to highlight.
  });
}

export function useFindInPage(activeWebviewLabel: string | null): FindInPageApi {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const runHighlight = React.useCallback(
    (value: string) => {
      if (activeWebviewLabel) {
        safeEval(activeWebviewLabel, highlightScript(value));
      }
    },
    [activeWebviewLabel],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => runHighlight(query), QUERY_DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer.current);
  }, [query, open, runHighlight]);

  const openFind = React.useCallback(() => setOpen(true), []);

  const closeFind = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    if (activeWebviewLabel) {
      safeEval(activeWebviewLabel, clearHighlightsScript());
    }
  }, [activeWebviewLabel]);

  const findNext = React.useCallback(() => {
    if (activeWebviewLabel) {
      safeEval(activeWebviewLabel, nextMatchScript());
    }
  }, [activeWebviewLabel]);

  const findPrevious = React.useCallback(() => {
    if (activeWebviewLabel) {
      safeEval(activeWebviewLabel, previousMatchScript());
    }
  }, [activeWebviewLabel]);

  return { open, query, setQuery, openFind, closeFind, findNext, findPrevious };
}
