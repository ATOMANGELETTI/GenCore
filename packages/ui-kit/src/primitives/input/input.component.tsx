import { cn } from "../../lib/cn";
import type { InputProps } from "./input.types";
import { inputVariants } from "./input.variants";

export function Input({ className, ...props }: InputProps) {
  return <input data-slot="input" className={cn(inputVariants(), className)} {...props} />;
}
