import type * as React from "react";

export interface StatusbarProps extends React.ComponentPropsWithRef<"footer"> {
  /** Leading slot. Defaults to the idle status text. */
  statusbarStart?: React.ReactNode;
  /** Trailing slot. */
  statusbarEnd?: React.ReactNode;
  /** Text shown when `statusbarStart` is omitted. */
  idleLabel?: string;
}
