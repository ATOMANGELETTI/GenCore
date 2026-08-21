import { describe, expect, it } from "vitest";
import { scanOsc7 } from "../../src/modules/terminal/terminal.osc7";

describe("scanOsc7", () => {
  it("parses file://host/C:/Users/x and file:///C:/Users/x into a Windows path", () => {
    expect(scanOsc7("\x1b]7;file://host/C:/Users/x\x07")).toBe("C:\\Users\\x");
    expect(scanOsc7("\x1b]7;file:///C:/Users/x\x07")).toBe("C:\\Users\\x");
    expect(scanOsc7("file://host/C:/Users/x")).toBe("C:\\Users\\x");
    expect(scanOsc7("file:///C:/Users/x")).toBe("C:\\Users\\x");
  });

  it("parses OSC 7 terminated with ST", () => {
    expect(scanOsc7("\x1b]7;file:///C:/Users/x\x1b\\")).toBe("C:\\Users\\x");
  });

  it("ignores garbage", () => {
    expect(scanOsc7("hello")).toBeNull();
    expect(scanOsc7("")).toBeNull();
    expect(scanOsc7("\x1b]0;title\x07")).toBeNull();
    expect(scanOsc7("\x1b]7;not-a-file-uri\x07")).toBeNull();
    expect(scanOsc7("file://host/not-a-windows-path")).toBeNull();
  });
});
