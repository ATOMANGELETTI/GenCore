import * as React from "react";

interface TerminalErrorBoundaryProps {
  children: React.ReactNode;
}

interface TerminalErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isolates xterm/PTY render failures so AppShell chrome stays visible.
 */
export class TerminalErrorBoundary extends React.Component<
  TerminalErrorBoundaryProps,
  TerminalErrorBoundaryState
> {
  public override state: TerminalErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): TerminalErrorBoundaryState {
    return { hasError: true };
  }

  public override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex h-full min-h-0 items-center justify-center p-3 text-sm text-muted-foreground"
        >
          Terminal failed to start
        </div>
      );
    }
    return this.props.children;
  }
}
