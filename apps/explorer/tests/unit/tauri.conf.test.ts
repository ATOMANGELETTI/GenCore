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
  "script-src": string;
  "frame-ancestors": string;
  "form-action": string;
  "worker-src": string;
};

const tauriConf = JSON.parse(
  readFileSync(resolve(process.cwd(), "src-tauri/tauri.conf.json"), "utf8"),
) as { app: { security: { csp: CspObject; devCsp: CspObject } } };

const { csp, devCsp } = tauriConf.app.security;

describe("explorer tauri.conf security", () => {
  it("keeps production connect-src limited to IPC", () => {
    expect(csp["connect-src"]).toEqual(["ipc:", "http://ipc.localhost"]);
  });

  it("allows Vite HMR websockets only on devCsp", () => {
    expect(devCsp["connect-src"]).toEqual([
      "ipc:",
      "http://ipc.localhost",
      "'self'",
      "ws://localhost:5174",
      "ws://127.0.0.1:5174",
    ]);
  });

  it("copies every other production CSP directive into devCsp", () => {
    expect(devCsp["default-src"]).toBe(csp["default-src"]);
    expect(devCsp["img-src"]).toEqual(csp["img-src"]);
    expect(devCsp["style-src"]).toEqual(csp["style-src"]);
    expect(devCsp["font-src"]).toEqual(csp["font-src"]);
    expect(devCsp["object-src"]).toBe(csp["object-src"]);
    expect(devCsp["base-uri"]).toBe(csp["base-uri"]);
    expect(devCsp["script-src"]).toBe(csp["script-src"]);
    expect(devCsp["frame-ancestors"]).toBe(csp["frame-ancestors"]);
    expect(devCsp["form-action"]).toBe(csp["form-action"]);
    expect(devCsp["worker-src"]).toBe(csp["worker-src"]);
  });

  it("sets explicit script-src and deny directives on csp and devCsp", () => {
    expect(csp["script-src"]).toBe("'self'");
    expect(csp["frame-ancestors"]).toBe("'none'");
    expect(csp["form-action"]).toBe("'none'");
    expect(csp["worker-src"]).toBe("'none'");
    expect(devCsp["script-src"]).toBe("'self'");
    expect(devCsp["frame-ancestors"]).toBe("'none'");
    expect(devCsp["form-action"]).toBe("'none'");
    expect(devCsp["worker-src"]).toBe("'none'");
    expect(csp).not.toHaveProperty("frame-src");
    expect(devCsp).not.toHaveProperty("frame-src");
  });
});
