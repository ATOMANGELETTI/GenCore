import { describe, expect, it } from "vitest";
import {
  faviconUrlOf,
  hostnameOf,
  looksLikeUrl,
  resolveOmniboxInput,
  toNavigableUrl,
  toSearchUrl,
} from "../../src/modules/navigation-bar/navigation-bar.omnibox";

describe("looksLikeUrl", () => {
  it("treats scheme-prefixed input as a URL", () => {
    expect(looksLikeUrl("https://example.com")).toBe(true);
    expect(looksLikeUrl("http://localhost:5173")).toBe(true);
  });

  it("treats bare hostnames as URLs", () => {
    expect(looksLikeUrl("example.com")).toBe(true);
    expect(looksLikeUrl("github.com/ATOMANGELETTI/GenCore")).toBe(true);
    expect(looksLikeUrl("localhost:3000")).toBe(true);
  });

  it("treats plain text as a search query", () => {
    expect(looksLikeUrl("weather today")).toBe(false);
    expect(looksLikeUrl("how to center a div")).toBe(false);
    expect(looksLikeUrl("nord theme")).toBe(false);
  });
});

describe("toNavigableUrl", () => {
  it("keeps an existing scheme", () => {
    expect(toNavigableUrl("https://example.com")).toBe("https://example.com");
  });

  it("adds https:// to a bare host", () => {
    expect(toNavigableUrl("example.com")).toBe("https://example.com");
  });
});

describe("toSearchUrl", () => {
  it("URL-encodes the query against the given search engine", () => {
    expect(toSearchUrl("nord theme", "https://duckduckgo.com/?q=")).toBe(
      "https://duckduckgo.com/?q=nord%20theme",
    );
  });
});

describe("resolveOmniboxInput", () => {
  it("resolves URL-like input to a navigable URL", () => {
    expect(resolveOmniboxInput("example.com")).toBe("https://example.com");
  });

  it("resolves plain text to a search URL", () => {
    expect(resolveOmniboxInput("nord theme", "https://duckduckgo.com/?q=")).toBe(
      "https://duckduckgo.com/?q=nord%20theme",
    );
  });

  it("returns an empty string for empty input", () => {
    expect(resolveOmniboxInput("   ")).toBe("");
  });
});

describe("hostnameOf", () => {
  it("extracts the hostname from a URL", () => {
    expect(hostnameOf("https://github.com/ATOMANGELETTI/GenCore")).toBe("github.com");
  });

  it("falls back to the raw input when unparsable", () => {
    expect(hostnameOf("not a url")).toBe("not a url");
  });
});

describe("faviconUrlOf", () => {
  it("builds a favicon.ico URL for http(s) pages", () => {
    expect(faviconUrlOf("https://github.com/foo")).toBe("https://github.com/favicon.ico");
  });

  it("returns null for non-http(s) schemes", () => {
    expect(faviconUrlOf("data:text/html,hi")).toBeNull();
  });
});
