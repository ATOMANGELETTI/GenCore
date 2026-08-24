import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("monaco-editor", () => ({
  editor: {
    defineTheme: vi.fn(),
  },
}));

vi.mock("@monaco-editor/react", () => ({
  DiffEditor: (props: Record<string, unknown>) => (
    <div data-testid="mock-diff-editor" data-theme={props.theme}>
      <div data-testid="diff-original">{props.original as string}</div>
      <div data-testid="diff-modified">{props.modified as string}</div>
    </div>
  ),
  loader: {
    config: vi.fn(),
  },
}));

vi.mock("../../src/modules/ipc/ipc.pty", () => ({
  openPty: vi.fn(() => Promise.resolve({ session_id: "test-session-1" })),
  closePty: vi.fn(() => Promise.resolve()),
  writePty: vi.fn(() => Promise.resolve()),
  resizePty: vi.fn(() => Promise.resolve()),
  subscribePtyData: vi.fn(() => Promise.resolve(() => undefined)),
  subscribePtyExit: vi.fn(() => Promise.resolve(() => undefined)),
  loadPinnedTabs: vi.fn(() => Promise.resolve("")),
  savePinnedTabs: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../src/modules/ipc/ipc.git", () => ({
  gitGetDiff: vi.fn((_repoPath: string, filePath: string) =>
    Promise.resolve({
      path: filePath,
      head_content: "line 1\nline 2",
      working_content: "line 1\nline 2 modified\nline 3",
    }),
  ),
  gitStageFile: vi.fn(() => Promise.resolve()),
  gitDiscardChanges: vi.fn(() => Promise.resolve()),
}));

import { ThemeProvider } from "@gencore/ui-kit";
import { ConfigProvider } from "../../src/modules/config/config.hook";
import { TerminalView } from "../../src/modules/terminal/terminal.component";
import { TerminalProvider, useTerminalSession } from "../../src/modules/terminal/terminal.hook";

function DiffTabLauncher() {
  const session = useTerminalSession();

  return (
    <div>
      <button
        type="button"
        data-testid="launch-diff"
        onClick={() => {
          session.openDiffTab("src/main.ts", "C:/repo", "Diff: main.ts");
        }}
      >
        Open Diff Tab
      </button>
      <TerminalView />
    </div>
  );
}

restoreJsdomLocalStorage();

describe("Terminal Diff Tab Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("opens a Monaco diff tab and mounts DiffEditorView", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="polar-night">
        <ConfigProvider>
          <TerminalProvider>
            <DiffTabLauncher />
          </TerminalProvider>
        </ConfigProvider>
      </ThemeProvider>,
    );

    // Initial shell tab is active
    await waitFor(() => {
      expect(screen.getByRole("tab")).toBeInTheDocument();
    });

    // Click launch diff
    await user.click(screen.getByTestId("launch-diff"));

    // Diff tab pill should appear and be active
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /diff: main\.ts/i })).toBeInTheDocument();
    });

    // Monaco DiffEditor should be mounted and loaded
    await waitFor(() => {
      expect(screen.getByTestId("mock-diff-editor")).toBeInTheDocument();
    });

    expect(screen.getByTestId("diff-original")).toHaveTextContent("line 1 line 2");
    expect(screen.getByTestId("diff-modified")).toHaveTextContent("line 1 line 2 modified line 3");
  });
});

function restoreJsdomLocalStorage(): void {
  const jsdomStorage = (window as unknown as { _localStorage?: Storage })._localStorage;
  if (!jsdomStorage) {
    return;
  }

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    enumerable: true,
    get: () => jsdomStorage,
  });
}
