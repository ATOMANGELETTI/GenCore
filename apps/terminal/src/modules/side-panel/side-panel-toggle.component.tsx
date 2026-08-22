import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@gencore/ui-kit";
import { PanelLeft, PanelLeftClose } from "lucide-react";

export function SidePanelToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const label = isOpen ? "Collapse side panel (Ctrl+B)" : "Expand side panel (Ctrl+B)";
  const Icon = isOpen ? PanelLeftClose : PanelLeft;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            className="rounded-none text-muted-foreground hover:text-foreground"
            onClick={onToggle}
          >
            <Icon aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
