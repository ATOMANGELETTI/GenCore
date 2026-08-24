import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

if (typeof document.execCommand !== "function") {
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    writable: true,
    value: () => false,
  });
}

if (typeof document.queryCommandSupported !== "function") {
  Object.defineProperty(document, "queryCommandSupported", {
    configurable: true,
    writable: true,
    value: () => false,
  });
}

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
});
