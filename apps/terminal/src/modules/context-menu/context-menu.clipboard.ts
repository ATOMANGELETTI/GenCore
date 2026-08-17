export function hasTextSelection(): boolean {
  return Boolean(window.getSelection()?.toString());
}

export function copySelection(): boolean {
  if (typeof document.execCommand !== "function") {
    return false;
  }
  return document.execCommand("copy");
}

export function cutSelection(): boolean {
  if (typeof document.execCommand !== "function") {
    return false;
  }
  return document.execCommand("cut");
}

export function selectAllContent(): boolean {
  const contentArea = document.querySelector('[data-slot="content-area"]');
  if (!contentArea) {
    return false;
  }
  const selection = window.getSelection();
  if (!selection) {
    return false;
  }
  const range = document.createRange();
  range.selectNodeContents(contentArea);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

export async function canReadClipboard(): Promise<boolean> {
  if (!navigator.clipboard?.readText) {
    return false;
  }

  const query = navigator.permissions?.query;
  if (typeof query !== "function") {
    return true;
  }

  try {
    const status = await query.call(navigator.permissions, {
      name: "clipboard-read" as PermissionName,
    });
    if (status.state === "denied") {
      return false;
    }
    return true;
  } catch {
    return true;
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
    if (typeof document.execCommand !== "function") {
      return false;
    }
    return document.execCommand("insertText", false, text);
  } catch {
    return false;
  }
}
