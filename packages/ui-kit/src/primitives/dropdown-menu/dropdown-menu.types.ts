import type { VariantProps } from "class-variance-authority";
import type { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type * as React from "react";
import type { dropdownMenuItemVariants } from "./dropdown-menu.variants";

export type DropdownMenuProps = React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.Root>;
export type DropdownMenuTriggerProps = React.ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.Trigger
>;
export type DropdownMenuGroupProps = React.ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.Group
>;
export type DropdownMenuRadioGroupProps = React.ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.RadioGroup
>;
export type DropdownMenuRadioItemProps = React.ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.RadioItem
>;
export type DropdownMenuCheckboxItemProps = React.ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.CheckboxItem
>;
export type DropdownMenuSeparatorProps = React.ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.Separator
>;
export type DropdownMenuContentProps = React.ComponentPropsWithRef<
  typeof DropdownMenuPrimitive.Content
>;
export type DropdownMenuShortcutProps = React.ComponentPropsWithRef<"span">;

export interface DropdownMenuItemProps
  extends Omit<React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.Item>, "inset">,
    VariantProps<typeof dropdownMenuItemVariants> {}

export interface DropdownMenuLabelProps
  extends React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.Label> {
  inset?: boolean;
}
