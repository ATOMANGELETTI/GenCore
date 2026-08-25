import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useNavigation } from "../../src/modules/navigation/navigation.hook";

describe("useNavigation", () => {
  it("starts empty when no initial path is given", () => {
    const { result } = renderHook(() => useNavigation());
    expect(result.current.path).toBe("");
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(false);
  });

  it("navigates and tracks back/forward availability", () => {
    const { result } = renderHook(() => useNavigation("C:\\"));

    act(() => result.current.navigateTo("C:\\Users"));
    act(() => result.current.navigateTo("C:\\Users\\dev"));

    expect(result.current.path).toBe("C:\\Users\\dev");
    expect(result.current.canGoBack).toBe(true);
    expect(result.current.canGoForward).toBe(false);

    act(() => result.current.back());
    expect(result.current.path).toBe("C:\\Users");
    expect(result.current.canGoForward).toBe(true);

    act(() => result.current.forward());
    expect(result.current.path).toBe("C:\\Users\\dev");
  });

  it("navigating from the middle of history truncates forward entries", () => {
    const { result } = renderHook(() => useNavigation("C:\\"));

    act(() => result.current.navigateTo("C:\\Users"));
    act(() => result.current.navigateTo("C:\\Users\\dev"));
    act(() => result.current.back());
    act(() => result.current.navigateTo("C:\\Windows"));

    expect(result.current.path).toBe("C:\\Windows");
    expect(result.current.canGoForward).toBe(false);
  });

  it("up navigates to the parent directory", () => {
    const { result } = renderHook(() => useNavigation("C:\\Users\\dev"));

    act(() => result.current.up());
    expect(result.current.path).toBe("C:\\Users");

    act(() => result.current.up());
    expect(result.current.path).toBe("C:\\");
  });

  it("up on a drive root is a no-op", () => {
    const { result } = renderHook(() => useNavigation("C:\\"));

    act(() => result.current.up());
    expect(result.current.path).toBe("C:\\");
    expect(result.current.canGoBack).toBe(false);
  });

  it("exposes breadcrumbs for the current path", () => {
    const { result } = renderHook(() => useNavigation("C:\\Users\\dev"));
    expect(result.current.breadcrumbs.map((segment) => segment.label)).toEqual([
      "C:",
      "Users",
      "dev",
    ]);
  });
});
