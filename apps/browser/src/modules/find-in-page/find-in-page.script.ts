/**
 * Injected into the active tab's content webview via `evalTabWebview` to
 * implement find-in-page. `eval` is fire-and-forget (no return channel back
 * to the chrome UI), so match counts aren't surfaced — only highlighting and
 * prev/next navigation, which don't need a response.
 */

function jsStringLiteral(value: string): string {
  return JSON.stringify(value);
}

export function highlightScript(query: string): string {
  return `(() => {
    const prior = window.__gencoreFind;
    if (prior && Array.isArray(prior.marks)) {
      for (const mark of prior.marks) {
        const parent = mark.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
          parent.normalize();
        }
      }
    }
    window.__gencoreFind = { marks: [], index: -1 };

    const query = ${jsStringLiteral(query)};
    if (!query) {
      return;
    }
    const needle = query.toLowerCase();
    const skipTags = new Set(["SCRIPT", "STYLE", "MARK", "TEXTAREA", "INPUT"]);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || skipTags.has(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.textContent && node.textContent.toLowerCase().includes(needle)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    const textNodes = [];
    let current = walker.nextNode();
    while (current) {
      textNodes.push(current);
      current = walker.nextNode();
    }

    const marks = [];
    for (const textNode of textNodes) {
      const text = textNode.textContent || "";
      const lower = text.toLowerCase();
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      let idx = lower.indexOf(needle, cursor);
      while (idx !== -1) {
        if (idx > cursor) {
          fragment.appendChild(document.createTextNode(text.slice(cursor, idx)));
        }
        const mark = document.createElement("mark");
        mark.dataset.gencoreFind = "true";
        mark.style.background = "#EBCB8B";
        mark.style.color = "#2E3440";
        mark.style.borderRadius = "2px";
        mark.textContent = text.slice(idx, idx + query.length);
        fragment.appendChild(mark);
        marks.push(mark);
        cursor = idx + query.length;
        idx = lower.indexOf(needle, cursor);
      }
      if (cursor < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(cursor)));
      }
      textNode.parentNode?.replaceChild(fragment, textNode);
    }

    window.__gencoreFind = { marks, index: marks.length > 0 ? 0 : -1 };
    if (marks.length > 0) {
      marks[0].style.background = "#D08770";
      marks[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  })();`;
}

function stepScript(direction: 1 | -1): string {
  return `(() => {
    const state = window.__gencoreFind;
    if (!state || !Array.isArray(state.marks) || state.marks.length === 0) {
      return;
    }
    const previous = state.marks[state.index];
    if (previous) {
      previous.style.background = "#EBCB8B";
    }
    state.index = (state.index + ${direction} + state.marks.length) % state.marks.length;
    const next = state.marks[state.index];
    if (next) {
      next.style.background = "#D08770";
      next.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  })();`;
}

export function nextMatchScript(): string {
  return stepScript(1);
}

export function previousMatchScript(): string {
  return stepScript(-1);
}

export function clearHighlightsScript(): string {
  return highlightScript("");
}
