import { ThemeProvider, TrayMenu, TrayMenuItem, TrayMenuSeparator } from "@gencore/ui-kit";
import { useOsTheme } from "../app/app.hook";
import { trayAction } from "../ipc/ipc.tray";

export function TrayMenuApp() {
  const osTheme = useOsTheme();
  return (
    <ThemeProvider theme={osTheme}>
      <AppTrayMenu />
    </ThemeProvider>
  );
}

function AppTrayMenu() {
  return (
    <TrayMenu>
      <TrayMenuItem onSelect={() => void trayAction("show")}>Show</TrayMenuItem>
      <TrayMenuItem onSelect={() => void trayAction("hide")}>Hide</TrayMenuItem>
      <TrayMenuSeparator />
      <TrayMenuItem variant="destructive" onSelect={() => void trayAction("quit")}>
        Quit
      </TrayMenuItem>
    </TrayMenu>
  );
}
