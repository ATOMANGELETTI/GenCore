import { AppearanceView } from "./appearance-view.component";
import { GeneralView } from "./general-view.component";

export function AllSettingsView() {
  return (
    <div data-slot="all-settings-view" className="space-y-4">
      <GeneralView />
      <AppearanceView />
    </div>
  );
}
