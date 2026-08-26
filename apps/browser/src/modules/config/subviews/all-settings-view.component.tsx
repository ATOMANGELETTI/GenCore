import { AppearanceView } from "./appearance-view.component";
import { GeneralView } from "./general-view.component";

interface AllSettingsViewProps {
  onClearBrowsingData?: () => void;
}

export function AllSettingsView({ onClearBrowsingData }: AllSettingsViewProps) {
  return (
    <div data-slot="all-settings-view" className="space-y-4">
      <GeneralView onClearBrowsingData={onClearBrowsingData} />
      <AppearanceView />
    </div>
  );
}
