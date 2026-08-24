import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Monaco DiffEditor
let lastMonacoProps: Record<string, unknown> = {};
vi.mock("monaco-editor", () => ({
  editor: {
    defineTheme: vi.fn(),
  },
}));

vi.mock("@monaco-editor/react", () => ({
  DiffEditor: (props: Record<string, unknown>) => {
    lastMonacoProps = props;
    return (
      <div
        data-testid="mock-diff-editor"
        data-theme={props.theme}
        data-original={props.original}
        data-modified={props.modified}
      >
        <div data-testid="mock-original">{props.original as string}</div>
        <div data-testid="mock-modified">{props.modified as string}</div>
      </div>
    );
  },
  loader: {
    config: vi.fn(),
  },
}));

vi.mock("../../src/modules/ipc/ipc.git", () => ({
  gitGetDiff: vi.fn((_repoPath: string, filePath: string) =>
    Promise.resolve({
      path: filePath,
      head_content: "const a = 1;\nconst b = 2;\n",
      working_content: "const a = 1;\nconst b = 3;\nconst c = 4;\n",
    }),
  ),
  gitStageFile: vi.fn(() => Promise.resolve()),
  gitDiscardChanges: vi.fn(() => Promise.resolve()),
}));

import { DiffEditorView } from "../../src/modules/diff-editor/diff-editor.component";
import { gitDiscardChanges, gitGetDiff, gitStageFile } from "../../src/modules/ipc/ipc.git";

describe("DiffEditorView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastMonacoProps = {};
  });

  it("loads and displays diff content with original and modified text", async () => {
    render(<DiffEditorView repoPath="C:/repo" filePath="src/index.ts" theme="polar-night" />);

    await waitFor(() => {
      expect(gitGetDiff).toHaveBeenCalledWith("C:/repo", "src/index.ts");
    });

    expect(await screen.findByText("src/index.ts")).toBeInTheDocument();
    expect(screen.getByTestId("mock-original")).toHaveTextContent("const b = 2;");
    expect(screen.getByTestId("mock-modified")).toHaveTextContent("const b = 3;");
    expect(screen.getByTestId("diff-editor-theme")).toHaveAttribute("data-theme", "nord-dark");
  });

  it("defaults to inline (unified) diff mode and toggles to split (side-by-side) mode", async () => {
    const user = userEvent.setup();
    render(<DiffEditorView repoPath="C:/repo" filePath="src/index.ts" theme="polar-night" />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-diff-editor")).toBeInTheDocument();
    });

    // Monaco options should default to renderSideBySide: false (inline/unified)
    const options = lastMonacoProps.options as Record<string, unknown>;
    expect(options.renderSideBySide).toBe(false);

    // Toggle to split mode
    const splitBtn = screen.getByLabelText("Split diff view");
    await user.click(splitBtn);

    const updatedOptions = lastMonacoProps.options as Record<string, unknown>;
    expect(updatedOptions.renderSideBySide).toBe(true);
  });

  it("handles stage file and discard changes buttons", async () => {
    const user = userEvent.setup();
    const onStage = vi.fn();
    const onDiscard = vi.fn();

    render(
      <DiffEditorView
        repoPath="C:/repo"
        filePath="src/index.ts"
        theme="polar-night"
        onStage={onStage}
        onDiscard={onDiscard}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-diff-editor")).toBeInTheDocument();
    });

    const stageBtn = screen.getByLabelText("Stage file changes");
    await user.click(stageBtn);
    expect(gitStageFile).toHaveBeenCalledWith("C:/repo", "src/index.ts");
    expect(onStage).toHaveBeenCalled();

    const discardBtn = screen.getByLabelText("Discard file changes");
    await user.click(discardBtn);
    expect(gitDiscardChanges).toHaveBeenCalledWith("C:/repo", "src/index.ts");
    expect(onDiscard).toHaveBeenCalled();
  });

  it("handles edit in micro button callback", async () => {
    const user = userEvent.setup();
    const onOpenMicro = vi.fn();

    render(
      <DiffEditorView
        repoPath="C:/repo"
        filePath="src/index.ts"
        theme="polar-night"
        onOpenMicro={onOpenMicro}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-diff-editor")).toBeInTheDocument();
    });

    const microBtn = screen.getByLabelText("Edit in Micro");
    await user.click(microBtn);
    expect(onOpenMicro).toHaveBeenCalledWith("src/index.ts");
  });
});
