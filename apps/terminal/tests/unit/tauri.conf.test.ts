import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type CspObject = {
  "default-src": string;
  "connect-src": string[];
  "img-src": string[];
  "style-src": string[];
  "font-src": string[];
  "object-src": string;
  "base-uri": string;
};

const tauriConf = JSON.parse(
  readFileSync(resolve(process.cwd(), "src-tauri/tauri.conf.json"), "utf8"),
) as { app: { security: { csp: CspObject; devCsp: CspObject } } };

const { csp, devCsp } = tauriConf.app.security;

describe("terminal tauri.conf security", () => {
  it("keeps production connect-src limited to IPC", () => {
    expect(csp["connect-src"]).toEqual(["ipc:", "http://ipc.localhost"]);
  });

  it("allows Vite HMR websockets only on devCsp", () => {
    expect(devCsp["connect-src"]).toEqual([
      "ipc:",
      "http://ipc.localhost",
      "'self'",
      "ws://localhost:5173",
      "ws://127.0.0.1:5173",
    ]);
  });

  it("copies every other production CSP directive into devCsp", () => {
    expect(devCsp["default-src"]).toBe(csp["default-src"]);
    expect(devCsp["img-src"]).toEqual(csp["img-src"]);
    expect(devCsp["style-src"]).toEqual(csp["style-src"]);
    expect(devCsp["font-src"]).toEqual(csp["font-src"]);
    expect(devCsp["object-src"]).toBe(csp["object-src"]);
    expect(devCsp["base-uri"]).toBe(csp["base-uri"]);
  });
});
