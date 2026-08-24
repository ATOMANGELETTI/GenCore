import type { ThemeName } from "@gencore/ui-kit";
import { FitAddon } from "@xterm/addon-fit";
import { SerializeAddon } from "@xterm/addon-serialize";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import type { BackgroundEffectType } from "../config/config.types";
import { nordXtermTheme } from "./terminal.theme";

export interface XtermHost {
  terminal: Terminal;
  fit: FitAddon;
  serialize: SerializeAddon;
  dispose: () => void;
}

export function createXterm(
  el: HTMLElement,
  theme: ThemeName,
  effect: BackgroundEffectType = "none",
): XtermHost {
  const terminal = new Terminal({
    allowProposedApi: true,
    allowTransparency: true,
    fontFamily: '"Terminess Nerd Font Mono", monospace',
    fontSize: 13,
    lineHeight: 1.2,
    cursorBlink: true,
    cursorStyle: "bar",
    theme: nordXtermTheme(theme, effect),
    scrollback: 4096,
    rightClickSelectsWord: false,
  });
  const fit = new FitAddon();
  const serialize = new SerializeAddon();
  terminal.loadAddon(fit);
  terminal.loadAddon(serialize);
  terminal.open(el);

  return {
    terminal,
    fit,
    serialize,
    dispose: () => {
      terminal.dispose();
    },
  };
}

const SESSION_SEAM_SGR = "\x1b[38;2;76;86;106m";
const SESSION_SEAM_RESET = "\x1b[0m";

export function restoreSerializedBuffer(
  terminal: Pick<Terminal, "write">,
  scrollback: string,
  seam: string,
): void {
  if (scrollback) {
    terminal.write(scrollback);
  }
  terminal.write(`${SESSION_SEAM_SGR}${seam}${SESSION_SEAM_RESET}\r\n`);
}
