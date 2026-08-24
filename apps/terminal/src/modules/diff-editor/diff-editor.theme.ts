import type { Monaco } from "@monaco-editor/react";

export const NORD_DARK_THEME = "nord-dark";
export const NORD_LIGHT_THEME = "nord-light";

export function registerNordMonacoThemes(monaco: Monaco): void {
  monaco.editor.defineTheme(NORD_DARK_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "D8DEE9", background: "2E3440" },
      { token: "comment", foreground: "616E88", fontStyle: "italic" },
      { token: "keyword", foreground: "81A1C1", fontStyle: "bold" },
      { token: "string", foreground: "A3BE8C" },
      { token: "number", foreground: "B48EAD" },
      { token: "type", foreground: "8FBCBB" },
      { token: "function", foreground: "88C0D0" },
      { token: "variable", foreground: "D8DEE9" },
    ],
    colors: {
      "editor.background": "#2E3440",
      "editor.foreground": "#D8DEE9",
      "editorLineNumber.foreground": "#4C566A",
      "editorLineNumber.activeForeground": "#88C0D0",
      "editorCursor.foreground": "#D8DEE9",
      "editor.selectionBackground": "#434C5E80",
      "editor.lineHighlightBackground": "#3B425250",
      "diffEditor.insertedTextBackground": "#A3BE8C25",
      "diffEditor.removedTextBackground": "#BF616A25",
      "diffEditor.insertedLineBackground": "#A3BE8C15",
      "diffEditor.removedLineBackground": "#BF616A15",
      "diffEditorGutter.insertedLineBackground": "#A3BE8C50",
      "diffEditorGutter.removedLineBackground": "#BF616A50",
      "diffEditorOverview.insertedForeground": "#A3BE8C",
      "diffEditorOverview.removedForeground": "#BF616A",
      "scrollbarSlider.background": "#4C566A40",
      "scrollbarSlider.hoverBackground": "#4C566A80",
      "scrollbarSlider.activeBackground": "#88C0D060",
    },
  });

  monaco.editor.defineTheme(NORD_LIGHT_THEME, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "", foreground: "2E3440", background: "ECEFF4" },
      { token: "comment", foreground: "4C566A", fontStyle: "italic" },
      { token: "keyword", foreground: "5E81AC", fontStyle: "bold" },
      { token: "string", foreground: "A3BE8C" },
      { token: "number", foreground: "B48EAD" },
      { token: "type", foreground: "8FBCBB" },
      { token: "function", foreground: "88C0D0" },
      { token: "variable", foreground: "2E3440" },
    ],
    colors: {
      "editor.background": "#ECEFF4",
      "editor.foreground": "#2E3440",
      "editorLineNumber.foreground": "#D8DEE9",
      "editorLineNumber.activeForeground": "#5E81AC",
      "editorCursor.foreground": "#2E3440",
      "editor.selectionBackground": "#E5E9F0",
      "editor.lineHighlightBackground": "#E5E9F060",
      "diffEditor.insertedTextBackground": "#A3BE8C30",
      "diffEditor.removedTextBackground": "#BF616A30",
      "diffEditor.insertedLineBackground": "#A3BE8C18",
      "diffEditor.removedLineBackground": "#BF616A18",
      "diffEditorGutter.insertedLineBackground": "#A3BE8C60",
      "diffEditorGutter.removedLineBackground": "#BF616A60",
      "diffEditorOverview.insertedForeground": "#A3BE8C",
      "diffEditorOverview.removedForeground": "#BF616A",
      "scrollbarSlider.background": "#D8DEE960",
      "scrollbarSlider.hoverBackground": "#D8DEE9A0",
      "scrollbarSlider.activeBackground": "#5E81AC60",
    },
  });
}
