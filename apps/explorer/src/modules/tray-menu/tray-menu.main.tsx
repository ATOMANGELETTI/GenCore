import "@gencore/ui-kit/styles/globals.css";
import "@gencore/ui-kit/styles/theme.polar-night.css";
import "@gencore/ui-kit/styles/theme.snow-storm.css";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { TrayMenuApp } from "./tray-menu.component";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <TrayMenuApp />
  </React.StrictMode>,
);
