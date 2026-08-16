import { cva } from "class-variance-authority";
import {
  menuContentVariants,
  menuIndicatorItemVariants,
  menuItemVariants,
  menuLabelVariants,
  menuSeparatorVariants,
  menuShortcutVariants,
} from "../menu/menu.variants";

export const contextMenuContentVariants = cva([
  menuContentVariants(),
  "origin-(--radix-context-menu-content-transform-origin)",
]);

export const contextMenuItemVariants = menuItemVariants;
export const contextMenuIndicatorItemVariants = menuIndicatorItemVariants;
export const contextMenuLabelVariants = menuLabelVariants;
export const contextMenuSeparatorVariants = menuSeparatorVariants;
export const contextMenuShortcutVariants = menuShortcutVariants;
