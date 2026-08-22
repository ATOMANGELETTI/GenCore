import { chromium, expect, test, type Page } from "@playwright/test";

const CDP = "http://127.0.0.1:9223";
const MARKER = "gencore-pty-alive";
const UNKNOWN_COMMAND = "gencore-pty-nosuch";
const ERROR_PHRASE = /not recognized|CommandNotFound/i;
const VISIBLE_HOST = '[data-slot="terminal-host"]:not([aria-hidden="true"])';
const POWERLINE_SEP = /[\uE0B0\uE0B4\uE0B6]/;

async function connectWebView() {
  try {
    return await chromium.connectOverCDP(CDP);
  } catch {
    throw new Error(
      `WebView2 CDP is not reachable at ${CDP}. Start pnpm --filter @gencore/terminal tauri:dev. Do not use http://localhost:5173.`,
    );
  }
}

function readVisibleBuffer(page: Page) {
  return page.evaluate((hostSel) => {
    const node = document.querySelector(hostSel);
    const term = (
      node as
        | (Element & {
            __gencoreXterm?: {
              buffer: {
                active: {
                  length: number;
                  getLine: (
                    i: number,
                  ) => { translateToString: (t?: boolean) => string } | undefined;
                };
              };
            };
          })
        | null
    )?.__gencoreXterm;
    if (!term) {
      return "";
    }
    const lines: string[] = [];
    for (let i = 0; i < term.buffer.active.length; i++) {
      lines.push(term.buffer.active.getLine(i)?.translateToString(true) ?? "");
    }
    return lines.join("\n");
  }, VISIBLE_HOST);
}

function promptSnapshot(text: string) {
  const nonEmptyLines = text.split("\n").filter((line) => line.trim().length > 0);
  const first = nonEmptyLines[0] ?? "";
  return {
    nonEmptyLines,
    hasPowerline: POWERLINE_SEP.test(text),
    classicOnly: nonEmptyLines.length === 1 && /^\s*PS\s.*>\s*$/.test(first),
    frostOnly: nonEmptyLines.length === 1 && /^\s*❯\s*$/.test(first),
  };
}

test("PowerShell pane shows a prompt and echoes a marker", async () => {
  const browser = await connectWebView();
  try {
    const pages = browser.contexts().flatMap((context) => context.pages());
    const page =
      pages.find((item) => item.url() === "http://localhost:5173/") ??
      pages.find(
        (item) => item.url().startsWith("http://localhost:5173") && !item.url().includes(".html"),
      ) ??
      pages[0];
    if (!page) {
      throw new Error("No WebView page from CDP");
    }

    // xterm 6 in this app uses the DOM renderer (no <canvas>); assert the DOM
    // surface, live session status, and a PTY-echoed marker instead.
    // Scope to the visible pane: multiple tabs each render a host, and only
    // the active one drops `aria-hidden="true"`.
    const host = page.locator(VISIBLE_HOST);
    await expect(host).toBeVisible({ timeout: 30_000 });
    await expect(host).toHaveAttribute("data-status", "live");
    await expect(host).toHaveAttribute("data-session-id", /.+/);

    const xtermBox = await host.locator(".xterm").first().boundingBox();
    expect(xtermBox?.width ?? 0).toBeGreaterThan(40);
    expect(xtermBox?.height ?? 0).toBeGreaterThan(40);

    await host.click();
    await page.keyboard.type(`echo ${MARKER}`);
    await page.keyboard.press("Enter");

    await expect.poll(() => readVisibleBuffer(page), { timeout: 20_000 }).toContain(MARKER);
  } finally {
    await browser.close();
  }
});

test("Oh My Posh 2-line prompt stays interactive", async () => {
  const browser = await connectWebView();
  try {
    const pages = browser.contexts().flatMap((context) => context.pages());
    const page =
      pages.find((item) => item.url() === "http://localhost:5173/") ??
      pages.find(
        (item) => item.url().startsWith("http://localhost:5173") && !item.url().includes(".html"),
      ) ??
      pages[0];
    if (!page) {
      throw new Error("No WebView page from CDP");
    }

    const host = page.locator(VISIBLE_HOST);
    await expect(host).toBeVisible({ timeout: 30_000 });

    await expect
      .poll(
        async () => {
          const snap = promptSnapshot(await readVisibleBuffer(page));
          return (
            snap.nonEmptyLines.length >= 2 &&
            snap.hasPowerline &&
            !snap.classicOnly &&
            !snap.frostOnly
          );
        },
        { timeout: 20_000 },
      )
      .toBe(true);

    const snap = promptSnapshot(await readVisibleBuffer(page));
    expect(snap.nonEmptyLines.length).toBeGreaterThanOrEqual(2);
    expect(snap.hasPowerline).toBe(true);
    expect(snap.classicOnly).toBe(false);
    expect(snap.frostOnly).toBe(false);

    await host.click();
    await page.keyboard.type(`echo ${MARKER}`);
    await page.keyboard.press("Enter");

    await expect.poll(() => readVisibleBuffer(page), { timeout: 20_000 }).toContain(MARKER);
  } finally {
    await browser.close();
  }
});

test("unknown command writes an error phrase that is not the typed line", async () => {
  expect(UNKNOWN_COMMAND).not.toMatch(ERROR_PHRASE);

  const browser = await connectWebView();
  try {
    const pages = browser.contexts().flatMap((context) => context.pages());
    const page =
      pages.find((item) => item.url() === "http://localhost:5173/") ??
      pages.find(
        (item) => item.url().startsWith("http://localhost:5173") && !item.url().includes(".html"),
      ) ??
      pages[0];
    if (!page) {
      throw new Error("No WebView page from CDP");
    }

    const host = page.locator(VISIBLE_HOST);
    await expect(host).toBeVisible({ timeout: 30_000 });
    await expect(host).toHaveAttribute("data-status", "live");
    await expect(host).toHaveAttribute("data-session-id", /.+/);

    await host.click();
    await page.keyboard.type(UNKNOWN_COMMAND);
    await page.keyboard.press("Enter");

    await expect.poll(() => readVisibleBuffer(page), { timeout: 20_000 }).toMatch(ERROR_PHRASE);
  } finally {
    await browser.close();
  }
});
