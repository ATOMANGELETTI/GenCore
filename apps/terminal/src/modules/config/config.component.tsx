import * as React from "react";
import { readActiveSubview, writeActiveSubview } from "./config.storage";
import { ConfigToolbar } from "./config.toolbar";
import type { ConfigSubviewId } from "./config.types";
import { AllSettingsView } from "./subviews/all-settings-view.component";
import { AppearanceView } from "./subviews/appearance-view.component";
import { AssistantView } from "./subviews/assistant-view.component";
import { EffectsView } from "./subviews/effects-view.component";
import { PromptView } from "./subviews/prompt-view.component";

export function Config() {
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
        {activeSubview === "appearance" ? (
          <AppearanceView />
        ) : activeSubview === "effects" ? (
          <EffectsView />
        ) : activeSubview === "prompt" ? (
          <PromptView />
        ) : activeSubview === "assistant" ? (
          <AssistantView />
        ) : (
          <AllSettingsView />
        )}
      </div>
    </div>
  );
}
