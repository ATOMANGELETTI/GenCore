import { Slot } from "radix-ui";
import { cn } from "../../lib/cn";
import type { ButtonProps } from "./button.types";
import { buttonVariants } from "./button.variants";

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild) {
    return <Slot.Root data-slot="button" className={classes} {...props} />;
  }

  const { type = "button", ...buttonProps } = props;
  return <button type={type} data-slot="button" className={classes} {...buttonProps} />;
}
