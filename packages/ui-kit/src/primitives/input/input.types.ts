import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { inputVariants } from "./input.variants";

export interface InputProps
  extends React.ComponentPropsWithRef<"input">,
    VariantProps<typeof inputVariants> {}
