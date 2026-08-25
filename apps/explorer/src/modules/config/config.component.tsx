import { useConfig } from "./config.hook";
import { ConfigToggle } from "./config.toggle";

export function Config() {
  const config = useConfig();

  return (
    <div data-slot="config-panel" className="flex h-full min-h-0 flex-col gap-1 bg-card p-2">
      <ConfigToggle
        checked={config.showHiddenFiles}
        label="Show hidden files"
        description="Include hidden and system items in listings"
        onCheckedChange={config.setShowHiddenFiles}
      />
      <ConfigToggle
        checked={config.showFileExtensions}
        label="Show file extensions"
        description="Display the full name, including the extension"
        onCheckedChange={config.setShowFileExtensions}
      />
      <ConfigToggle
        checked={config.confirmBeforeDelete}
        label="Confirm before delete"
        description="Ask before moving items to the Recycle Bin"
        onCheckedChange={config.setConfirmBeforeDelete}
      />
    </div>
  );
}
