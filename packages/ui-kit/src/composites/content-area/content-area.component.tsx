import { cn } from "../../lib/cn";
import type { ContentAreaProps } from "./content-area.types";
import { contentAreaVariants } from "./content-area.variants";

export function ContentArea({ className, centered, padded, ...props }: ContentAreaProps) {
  return (
    <main
      data-slot="content-area"
      className={cn(contentAreaVariants({ centered, padded }), className)}
      {...props}
    />
  );
}
