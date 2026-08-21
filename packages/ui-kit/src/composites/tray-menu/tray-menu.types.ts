import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { menuItemVariants } from "../../primitives/menu/menu.variants";

export interface TrayMenuProps extends React.ComponentPropsWithRef<"div"> {}

export interface TrayMenuItemProps
  extends Omit<React.ComponentPropsWithRef<"button">, "type">,
    VariantProps<typeof menuItemVariants> {
  onSelect?: () => void;
}

export interface TrayMenuSeparatorProps extends React.ComponentPropsWithRef<"div"> {}
