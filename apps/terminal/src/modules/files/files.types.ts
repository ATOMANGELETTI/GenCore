import type { LucideIcon } from "lucide-react";

export type FilesSubviewId = "explorer" | "source-control";

export interface FilesCategoryItem {
  id: FilesSubviewId;
  label: string;
  Icon: LucideIcon;
  badgeCount?: number;
}
