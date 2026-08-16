import "@gencore/ui-kit/styles/globals.css";
import "@gencore/ui-kit/styles/theme.polar-night.css";
import "./modules/app/app.theme.css";

import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { App } from "./modules/app/app.component";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
