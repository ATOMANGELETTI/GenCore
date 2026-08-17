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

afterEach(() => {
  cleanup();
});
