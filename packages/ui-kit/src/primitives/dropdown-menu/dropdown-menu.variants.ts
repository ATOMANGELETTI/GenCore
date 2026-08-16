import { cva } from "class-variance-authority";
import {
  menuContentVariants,
  menuIndicatorItemVariants,
  menuItemVariants,
  menuLabelVariants,
  menuSeparatorVariants,
  menuShortcutVariants,
} from "../menu/menu.variants";

export const dropdownMenuContentVariants = cva([
  menuContentVariants(),
  "origin-(--radix-dropdown-menu-content-transform-origin)",
]);

export const dropdownMenuItemVariants = menuItemVariants;
export const dropdownMenuIndicatorItemVariants = menuIndicatorItemVariants;
export const dropdownMenuLabelVariants = menuLabelVariants;
export const dropdownMenuSeparatorVariants = menuSeparatorVariants;
export const dropdownMenuShortcutVariants = menuShortcutVariants;
