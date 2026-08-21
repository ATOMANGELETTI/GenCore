import "@gencore/ui-kit/styles/globals.css";
import "@gencore/ui-kit/styles/theme.polar-night.css";
import "@gencore/ui-kit/styles/theme.snow-storm.css";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { TrayMenuApp } from "./tray-menu.component";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <TrayMenuApp />
  </React.StrictMode>,
);
