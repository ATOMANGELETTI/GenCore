import { CheckIcon, DotIcon } from "lucide-react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/cn";
import type {
  ContextMenuCheckboxItemProps,
  ContextMenuContentProps,
  ContextMenuGroupProps,
  ContextMenuItemProps,
  ContextMenuLabelProps,
  ContextMenuProps,
  ContextMenuRadioGroupProps,
  ContextMenuRadioItemProps,
  ContextMenuSeparatorProps,
  ContextMenuShortcutProps,
  ContextMenuTriggerProps,
} from "./context-menu.types";
import {
  contextMenuContentVariants,
  contextMenuIndicatorItemVariants,
  contextMenuItemVariants,
  contextMenuLabelVariants,
  contextMenuSeparatorVariants,
  contextMenuShortcutVariants,
} from "./context-menu.variants";

export function ContextMenu(props: ContextMenuProps) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

export function ContextMenuTrigger({ asChild, ...props }: ContextMenuTriggerProps) {
  if (asChild) {
    return <ContextMenuPrimitive.Trigger asChild {...props} />;
  }

  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

export function ContextMenuGroup(props: ContextMenuGroupProps) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

export function ContextMenuRadioGroup(props: ContextMenuRadioGroupProps) {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />;
}

export function ContextMenuContent({
  className,
  onOpenAutoFocus,
  ...props
}: ContextMenuContentProps) {
  const contentProps = {
    ...props,
    onOpenAutoFocus,
  } as React.ComponentPropsWithRef<typeof ContextMenuPrimitive.Content>;

  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(contextMenuContentVariants(), className)}
        {...contentProps}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuItem({ className, variant, inset, ...props }: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-variant={variant ?? "default"}
      className={cn(contextMenuItemVariants({ variant, inset }), className)}
      {...props}
    />
  );
}

export function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ContextMenuCheckboxItemProps) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      checked={checked}
      className={cn(contextMenuIndicatorItemVariants(), className)}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-4 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5" aria-hidden="true" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

export function ContextMenuRadioItem({ className, children, ...props }: ContextMenuRadioItemProps) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(contextMenuIndicatorItemVariants(), className)}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-4 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <DotIcon className="size-4 fill-current" aria-hidden="true" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

export function ContextMenuLabel({ className, inset = false, ...props }: ContextMenuLabelProps) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      className={cn(contextMenuLabelVariants({ inset }), className)}
      {...props}
    />
  );
}

export function ContextMenuSeparator({ className, ...props }: ContextMenuSeparatorProps) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn(contextMenuSeparatorVariants(), className)}
      {...props}
    />
  );
}

export function ContextMenuShortcut({ className, ...props }: ContextMenuShortcutProps) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(contextMenuShortcutVariants(), className)}
      {...props}
    />
  );
}
