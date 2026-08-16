import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { contentAreaVariants } from "./content-area.variants";

export interface ContentAreaProps
  extends React.ComponentPropsWithRef<"main">,
    VariantProps<typeof contentAreaVariants> {}
