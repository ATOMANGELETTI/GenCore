import * as React from "react";
import { parentWindowsPath, toBreadcrumbs } from "./navigation.path";
import type { NavigationApi } from "./navigation.types";

interface NavigationState {
  readonly history: readonly string[];
  readonly index: number;
}

const EMPTY_STATE: NavigationState = { history: [], index: -1 };

function pushPath(state: NavigationState, path: string): NavigationState {
  if (state.history[state.index] === path) {
    return state;
  }
  const trimmed = state.history.slice(0, state.index + 1);
  return { history: [...trimmed, path], index: trimmed.length };
}

/** Owns the current path plus a back/forward navigation history stack. */
export function useNavigation(initialPath = ""): NavigationApi {
  const [state, setState] = React.useState<NavigationState>(() =>
    initialPath ? pushPath(EMPTY_STATE, initialPath) : EMPTY_STATE,
  );

  const path = state.history[state.index] ?? "";

  const navigateTo = React.useCallback((next: string) => {
    setState((current) => pushPath(current, next));
  }, []);

  const back = React.useCallback(() => {
    setState((current) => (current.index > 0 ? { ...current, index: current.index - 1 } : current));
  }, []);

  const forward = React.useCallback(() => {
    setState((current) =>
      current.index < current.history.length - 1
        ? { ...current, index: current.index + 1 }
        : current,
    );
  }, []);

  const up = React.useCallback(() => {
    setState((current) => {
      const currentPath = current.history[current.index];
      if (!currentPath) {
        return current;
      }
      const parent = parentWindowsPath(currentPath);
      return parent === currentPath ? current : pushPath(current, parent);
    });
  }, []);

  return {
    path,
    canGoBack: state.index > 0,
    canGoForward: state.index < state.history.length - 1,
    breadcrumbs: toBreadcrumbs(path),
    navigateTo,
    back,
    forward,
    up,
  };
}
