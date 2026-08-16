import type { VariantProps } from "class-variance-authority";
import type { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import type * as React from "react";
import type { contextMenuItemVariants } from "./context-menu.variants";

export type ContextMenuProps = React.ComponentPropsWithRef<typeof ContextMenuPrimitive.Root>;
export type ContextMenuTriggerProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.Trigger
>;
export type ContextMenuGroupProps = React.ComponentPropsWithRef<typeof ContextMenuPrimitive.Group>;
export type ContextMenuRadioGroupProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.RadioGroup
>;
export type ContextMenuRadioItemProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.RadioItem
>;
export type ContextMenuCheckboxItemProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.CheckboxItem
>;
export type ContextMenuSeparatorProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.Separator
>;
export type ContextMenuContentProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.Content
>;
export type ContextMenuShortcutProps = React.ComponentPropsWithRef<"span">;

export interface ContextMenuItemProps
  extends Omit<React.ComponentPropsWithRef<typeof ContextMenuPrimitive.Item>, "inset">,
    VariantProps<typeof contextMenuItemVariants> {}

export interface ContextMenuLabelProps
  extends React.ComponentPropsWithRef<typeof ContextMenuPrimitive.Label> {
  inset?: boolean;
}
