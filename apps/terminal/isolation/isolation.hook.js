// Isolation application hook (sandboxed, runs before every IPC message is
// encrypted and forwarded to Tauri core). Anything not explicitly allowlisted
// here is dropped, regardless of what the (untrusted) main frontend sends.
//
// Allowed:
//   - gencore-core's app-info query
//   - the core window commands the titlebar/traffic-lights use
(() => {
  var ALLOWED_COMMANDS = [
    "plugin:gencore-core|get_app_info",
    "plugin:window|close",
    "plugin:window|minimize",
    "plugin:window|toggle_maximize",
    "plugin:window|start_dragging",
    "plugin:opener|open_url",
  ];

  window.__TAURI_ISOLATION_HOOK__ = (payload) => {
    if (payload && ALLOWED_COMMANDS.indexOf(payload.cmd) !== -1) {
      return payload;
    }

    console.error("[isolation] blocked non-allowlisted IPC command:", payload?.cmd);
    throw new Error("IPC command is not allowlisted by the isolation hook");
  };
})();
