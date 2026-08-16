import { cva } from "class-variance-authority";

export const contentAreaVariants = cva(
  "flex min-h-0 flex-1 flex-col overflow-auto bg-background text-foreground",
  {
    variants: {
      centered: {
        true: "items-center justify-center",
        false: "",
      },
      padded: {
        true: "p-4",
        false: "",
      },
    },
    defaultVariants: {
      centered: true,
      padded: true,
    },
  },
);
