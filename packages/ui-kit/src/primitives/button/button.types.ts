import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { buttonVariants } from "./button.variants";

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export interface ButtonProps
  extends React.ComponentPropsWithRef<"button">,
    VariantProps<typeof buttonVariants> {
  /** Render the child element instead of a `<button>`, keeping the styling. */
  asChild?: boolean;
}
