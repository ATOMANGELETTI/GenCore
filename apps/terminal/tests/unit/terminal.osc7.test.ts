import { describe, expect, it } from "vitest";
import { scanOsc7 } from "../../src/modules/terminal/terminal.osc7";

describe("scanOsc7", () => {
  it("parses file://host/C:/Users/x and file:///C:/Users/x into a Windows path", () => {
    expect(scanOsc7("\x1b]7;file://host/C:/Users/x\x07")).toBe("C:\\Users\\x");
    expect(scanOsc7("\x1b]7;file:///C:/Users/x\x07")).toBe("C:\\Users\\x");
  });

  it("parses OSC 7 terminated with ST", () => {
    expect(scanOsc7("\x1b]7;file:///C:/Users/x\x1b\\")).toBe("C:\\Users\\x");
  });

  it("takes the last complete OSC 7 in the chunk", () => {
    expect(scanOsc7("\x1b]7;file:///C:/one\x07text\x1b]7;file:///C:/two\x07")).toBe("C:\\two");
  });

  it("ignores a bare file:// URI printed by the shell", () => {
    expect(scanOsc7("file://host/C:/Users/x")).toBeNull();
    expect(scanOsc7("file:///C:/Users/x")).toBeNull();
    expect(scanOsc7("see file:///C:/Windows/System32 for details\r\n")).toBeNull();
  });

  it("ignores an unterminated OSC 7 sequence", () => {
    expect(scanOsc7("\x1b]7;file:///C:/Users/x")).toBeNull();
  });

  it("does not let a bare file:// URI override an earlier OSC 7", () => {
    expect(scanOsc7("\x1b]7;file:///C:/one\x07 file:///C:/two")).toBe("C:\\one");
  });

  it("ignores garbage", () => {
    expect(scanOsc7("hello")).toBeNull();
    expect(scanOsc7("")).toBeNull();
    expect(scanOsc7("\x1b]0;title\x07")).toBeNull();
    expect(scanOsc7("\x1b]7;not-a-file-uri\x07")).toBeNull();
    expect(scanOsc7("\x1b]7;file://host/not-a-windows-path\x07")).toBeNull();
  });
});
