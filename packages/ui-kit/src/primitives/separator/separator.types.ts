import type { VariantProps } from "class-variance-authority";
import type { Separator as SeparatorPrimitive } from "radix-ui";
import type * as React from "react";
import type { separatorVariants } from "./separator.variants";

type SeparatorRootProps = React.ComponentPropsWithRef<typeof SeparatorPrimitive.Root>;

export interface SeparatorProps
  extends Omit<SeparatorRootProps, "orientation">,
    Pick<VariantProps<typeof separatorVariants>, "inset"> {
  orientation?: "horizontal" | "vertical";
}
