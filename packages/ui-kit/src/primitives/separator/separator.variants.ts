import { cva } from "class-variance-authority";

/** Hairline only — 1px in both orientations, never a thicker rule. */
export const separatorVariants = cva("shrink-0 bg-border", {
  variants: {
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
    inset: {
      none: "",
      sm: "data-[orientation=horizontal]:my-1 data-[orientation=vertical]:mx-1",
      md: "data-[orientation=horizontal]:my-2 data-[orientation=vertical]:mx-2",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    inset: "none",
  },
});
