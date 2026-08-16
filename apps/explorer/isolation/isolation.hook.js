// Tauri isolation secure script. Runs in a sandboxed iframe between the
// webview and Tauri core, so every outgoing IPC payload passes through here
// before it is AES-GCM encrypted and forwarded. Classic script only — the
// isolation runtime does not support ES modules.
//
// This hook allowlists the exact command surface Explorer's UI is permitted
// to invoke. Anything else is rejected before it reaches the Rust side,
// giving a second line of defense on top of `capabilities/main.json`.
(() => {
  var ALLOWED_COMMANDS = [
    "plugin:gencore-core|get_app_info",
    "plugin:window|close",
    "plugin:window|minimize",
    "plugin:window|toggle_maximize",
    "plugin:window|start_dragging",
  ];

  window.__TAURI_ISOLATION_HOOK__ = (payload) => {
    var cmd = payload?.cmd;
    if (typeof cmd !== "string" || ALLOWED_COMMANDS.indexOf(cmd) === -1) {
      throw new Error(`gencore-explorer isolation: blocked IPC command ${String(cmd)}`);
    }
    return payload;
  };
})();
