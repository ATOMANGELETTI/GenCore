import { Slot } from "radix-ui";
import { cn } from "../../lib/cn";
import type { BadgeProps } from "./badge.types";
import { badgeVariants } from "./badge.variants";

export function Badge({ className, variant, numeric, asChild = false, ...props }: BadgeProps) {
  const Component = asChild ? Slot.Root : "span";

  return (
    <Component
      data-slot="badge"
      className={cn(badgeVariants({ variant, numeric }), className)}
      {...props}
    />
  );
}
