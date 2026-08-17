if (typeof document.execCommand !== "function") {
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    writable: true,
    value: () => false,
  });
}

export function hasTextSelection(): boolean {
  return Boolean(window.getSelection()?.toString());
}

export function copySelection(): boolean {
  return document.execCommand("copy");
}

export function cutSelection(): boolean {
  return document.execCommand("cut");
}

export function selectAllContent(): boolean {
  return document.execCommand("selectAll");
}

export async function canReadClipboard(): Promise<boolean> {
  try {
    if (!navigator.clipboard?.readText) {
      return false;
    }
    await navigator.clipboard.readText();
    return true;
  } catch {
    return false;
  }
}

export async function pasteText(): Promise<boolean> {
  try {
    if (!navigator.clipboard?.readText) {
      return false;
    }
    const text = await navigator.clipboard.readText();
    if (!text) {
      return false;
    }
    return document.execCommand("insertText", false, text);
  } catch {
    return false;
  }
}
