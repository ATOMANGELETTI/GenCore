import { Separator as SeparatorPrimitive } from "radix-ui";
import { cn } from "../../lib/cn";
import type { SeparatorProps } from "./separator.types";
import { separatorVariants } from "./separator.variants";

export function Separator({
  className,
  orientation = "horizontal",
  inset,
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(separatorVariants({ orientation, inset }), className)}
      {...props}
    />
  );
}
