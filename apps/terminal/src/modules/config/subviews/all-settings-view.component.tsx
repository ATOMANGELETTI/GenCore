import { AppearanceView } from "./appearance-view.component";
import { AssistantView } from "./assistant-view.component";
import { EffectsView } from "./effects-view.component";
import { PromptView } from "./prompt-view.component";

export function AllSettingsView() {
  return (
    <div data-slot="all-settings-view" className="space-y-4">
      <AppearanceView />
      <EffectsView />
      <PromptView />
      <AssistantView />
    </div>
  );
}
