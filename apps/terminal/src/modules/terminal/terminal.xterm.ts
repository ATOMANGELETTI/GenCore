import type { ThemeName } from "@gencore/ui-kit";
import { FitAddon } from "@xterm/addon-fit";
import { SerializeAddon } from "@xterm/addon-serialize";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { nordXtermTheme } from "./terminal.theme";

export interface XtermHost {
  terminal: Terminal;
  fit: FitAddon;
  serialize: SerializeAddon;
  dispose: () => void;
}

export function createXterm(el: HTMLElement, theme: ThemeName): XtermHost {
  const terminal = new Terminal({
    allowProposedApi: true,
    fontFamily: '"Terminess Nerd Font Mono", monospace',
    fontSize: 13,
    lineHeight: 1.2,
    cursorBlink: true,
    cursorStyle: "bar",
    theme: nordXtermTheme(theme),
    scrollback: 4096,
    rightClickSelectsWord: false,
  });
  const fit = new FitAddon();
  const serialize = new SerializeAddon();
  terminal.loadAddon(fit);
  terminal.loadAddon(serialize);
  terminal.open(el);

  let webgl: WebglAddon | undefined;
  try {
    webgl = new WebglAddon();
    terminal.loadAddon(webgl);
  } catch {
    webgl = undefined;
  }

  return {
    terminal,
    fit,
    serialize,
    dispose: () => {
      webgl?.dispose();
      terminal.dispose();
    },
  };
}
