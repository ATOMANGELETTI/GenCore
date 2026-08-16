/** Options accepted by {@link import('./vite.tauri-factory').createTauriViteConfig}. */
export interface TauriViteFactoryOptions {
  /**
   * Fixed dev-server port for this app.
   * Must match the `devUrl` port configured in the app's `tauri.conf.json5`.
   */
  readonly port: number;
}
