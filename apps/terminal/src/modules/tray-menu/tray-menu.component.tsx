import { ThemeProvider, TrayMenu, TrayMenuItem, TrayMenuSeparator } from "@gencore/ui-kit";
import { ConfigProvider, useConfig } from "../config/config.hook";
import { trayAction } from "../ipc/ipc.tray";

export function TrayMenuApp() {
  return (
    <ConfigProvider>
      <ThemedTrayMenu />
    </ConfigProvider>
  );
}

function ThemedTrayMenu() {
  const { resolvedTheme } = useConfig();
  return (
    <ThemeProvider theme={resolvedTheme}>
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
