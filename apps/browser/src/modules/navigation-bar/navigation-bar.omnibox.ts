export const DEFAULT_SEARCH_ENGINE_URL = "https://duckduckgo.com/?q=";

const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
/** `host`, `host.tld`, `host.tld/path`, `localhost:5173`, `192.168.1.1` — no spaces. */
const BARE_HOST_PATTERN = /^[^\s]+\.[^\s]{2,}(\/\S*)?$/;
const LOCALHOST_PATTERN = /^localhost(:\d+)?(\/\S*)?$/i;

/** True when `input` looks like a URL/host rather than a search query. */
export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length === 0 || /\s/.test(trimmed)) {
    return SCHEME_PATTERN.test(trimmed);
  }
  return (
    SCHEME_PATTERN.test(trimmed) ||
    BARE_HOST_PATTERN.test(trimmed) ||
    LOCALHOST_PATTERN.test(trimmed)
  );
}

/** Normalizes omnibox input into a navigable `https://...`/`http://...` URL. */
export function toNavigableUrl(input: string): string {
  const trimmed = input.trim();
  if (SCHEME_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/** Builds a search-engine URL for a plain-text query. */
export function toSearchUrl(query: string, searchEngineUrl = DEFAULT_SEARCH_ENGINE_URL): string {
  return `${searchEngineUrl}${encodeURIComponent(query.trim())}`;
}

/** Resolves arbitrary omnibox input to the URL that should be navigated to. */
export function resolveOmniboxInput(
  input: string,
  searchEngineUrl = DEFAULT_SEARCH_ENGINE_URL,
): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return "";
  }
  return looksLikeUrl(trimmed) ? toNavigableUrl(trimmed) : toSearchUrl(trimmed, searchEngineUrl);
}

/** Extracts a display hostname from a URL, or the raw input if unparsable. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

/** Guesses a favicon URL from a page URL, or `null` for non-http(s) URLs. */
export function faviconUrlOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}/favicon.ico`;
  } catch {
    return null;
  }
}
