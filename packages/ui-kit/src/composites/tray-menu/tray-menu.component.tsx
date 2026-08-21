import { cn } from "../../lib/cn";
import {
  menuContentVariants,
  menuItemVariants,
  menuSeparatorVariants,
} from "../../primitives/menu/menu.variants";
import type { TrayMenuItemProps, TrayMenuProps, TrayMenuSeparatorProps } from "./tray-menu.types";

export function TrayMenu({ className, ...props }: TrayMenuProps) {
  return (
    <div
      data-slot="tray-menu"
      role="menu"
      className={cn(menuContentVariants(), className)}
      {...props}
    />
  );
}

export function TrayMenuItem({
  className,
  variant,
  inset,
  onSelect,
  onClick,
  ...props
}: TrayMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      data-slot="tray-menu-item"
      data-variant={variant ?? "default"}
      className={cn(menuItemVariants({ variant, inset }), className)}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        onSelect?.();
      }}
    />
  );
}

export function TrayMenuSeparator({ className, ...props }: TrayMenuSeparatorProps) {
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: decorative menu rule, not a keyboard target
    // biome-ignore lint/a11y/useSemanticElements: presentational menu separator matches ui-kit CVA
    <div
      data-slot="tray-menu-separator"
      // biome-ignore lint/a11y/useAriaPropsForRole: not a window splitter; aria-valuenow does not apply
      role="separator"
      className={cn(menuSeparatorVariants(), className)}
      {...props}
    />
  );
}
