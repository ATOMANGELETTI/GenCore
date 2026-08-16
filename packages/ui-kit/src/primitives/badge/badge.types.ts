import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { badgeVariants } from "./badge.variants";

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export interface BadgeProps
  extends React.ComponentPropsWithRef<"span">,
    VariantProps<typeof badgeVariants> {
  /** Render the child element instead of a `<span>`, keeping the styling. */
  asChild?: boolean;
}
