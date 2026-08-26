import * as React from "react";
import { readActiveSubview, writeActiveSubview } from "./config.storage";
import { ConfigToolbar } from "./config.toolbar";
import type { ConfigSubviewId } from "./config.types";
import { AllSettingsView } from "./subviews/all-settings-view.component";
import { AppearanceView } from "./subviews/appearance-view.component";
import { GeneralView } from "./subviews/general-view.component";

interface ConfigProps {
  onClearBrowsingData?: () => void;
}

export function Config({ onClearBrowsingData }: ConfigProps) {
  const [activeSubview, setActiveSubview] = React.useState<ConfigSubviewId>(() =>
    readActiveSubview(),
  );

  function handleSelectSubview(id: ConfigSubviewId) {
    setActiveSubview(id);
    writeActiveSubview(id);
  }

  return (
    <div data-slot="config-panel" className="flex h-full min-h-0 flex-col bg-card">
      <ConfigToolbar activeSubview={activeSubview} onSelectSubview={handleSelectSubview} />
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {activeSubview === "general" ? (
          <GeneralView onClearBrowsingData={onClearBrowsingData} />
        ) : activeSubview === "appearance" ? (
          <AppearanceView />
        ) : (
          <AllSettingsView onClearBrowsingData={onClearBrowsingData} />
        )}
      </div>
    </div>
  );
}
