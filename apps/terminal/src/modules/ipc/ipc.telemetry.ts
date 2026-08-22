import { invoke } from "@tauri-apps/api/core";
import type { SystemTelemetry } from "../telemetry/telemetry.types";

const GET_SYSTEM_TELEMETRY_COMMAND = "plugin:gencore-core|get_system_telemetry";

export function getSystemTelemetry(): Promise<SystemTelemetry> {
  return invoke<SystemTelemetry>(GET_SYSTEM_TELEMETRY_COMMAND);
}
