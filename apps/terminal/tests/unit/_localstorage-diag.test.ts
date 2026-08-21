import { describe, expect, it } from "vitest";

describe("localStorage environment", () => {
  it("reports globals", () => {
    const before = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const snapshot = {
      windowIsGlobalThis: window === globalThis,
      typeofWindowBefore: typeof window.localStorage,
      windowOwnBefore: Object.getOwnPropertyDescriptor(window, "localStorage")?.get?.name,
      protoHas: "localStorage" in Object.getPrototypeOf(window),
      sessionType: typeof window.sessionStorage,
    };
    delete (globalThis as { localStorage?: Storage }).localStorage;
    const after = {
      afterDeleteWindow: typeof window.localStorage,
      afterDeleteGlobal: typeof (globalThis as { localStorage?: Storage }).localStorage,
      windowOwnAfter: Object.getOwnPropertyDescriptor(window, "localStorage"),
      protoAfter: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), "localStorage"),
    };
    if (before) {
      Object.defineProperty(globalThis, "localStorage", before);
    }
    expect({ snapshot, after }).toEqual(null);
  });
});
