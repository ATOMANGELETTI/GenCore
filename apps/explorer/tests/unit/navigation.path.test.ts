import { describe, expect, it } from "vitest";
import {
  basename,
  isDriveRoot,
  joinWindowsPath,
  parentWindowsPath,
  toBreadcrumbs,
} from "../../src/modules/navigation/navigation.path";

describe("navigation.path", () => {
  it("joins a directory and a name with a single backslash", () => {
    expect(joinWindowsPath("C:\\Users\\dev", "file.txt")).toBe("C:\\Users\\dev\\file.txt");
    expect(joinWindowsPath("C:\\", "Users")).toBe("C:\\Users");
  });

  it("computes the parent of a nested path", () => {
    expect(parentWindowsPath("C:\\Users\\dev\\Documents")).toBe("C:\\Users\\dev");
    expect(parentWindowsPath("C:\\Users\\dev")).toBe("C:\\Users");
  });

  it("treats a drive root as its own parent", () => {
    expect(parentWindowsPath("C:\\")).toBe("C:\\");
  });

  it("returns the drive root as parent for a top-level folder", () => {
    expect(parentWindowsPath("C:\\Users")).toBe("C:\\");
  });

  it("extracts the final path component", () => {
    expect(basename("C:\\Users\\dev\\Documents")).toBe("Documents");
    expect(basename("C:\\Users\\dev\\Documents\\")).toBe("Documents");
    expect(basename("C:\\")).toBe("C:");
  });

  it("recognizes drive roots", () => {
    expect(isDriveRoot("C:\\")).toBe(true);
    expect(isDriveRoot("D:\\")).toBe(true);
    expect(isDriveRoot("C:\\Users")).toBe(false);
  });

  it("splits a path into breadcrumb segments with the drive root first", () => {
    const breadcrumbs = toBreadcrumbs("C:\\Users\\dev\\Documents");
    expect(breadcrumbs).toEqual([
      { label: "C:", path: "C:\\" },
      { label: "Users", path: "C:\\Users" },
      { label: "dev", path: "C:\\Users\\dev" },
      { label: "Documents", path: "C:\\Users\\dev\\Documents" },
    ]);
  });

  it("returns a single segment for a bare drive root", () => {
    expect(toBreadcrumbs("C:\\")).toEqual([{ label: "C:", path: "C:\\" }]);
  });

  it("returns an empty array for an empty path", () => {
    expect(toBreadcrumbs("")).toEqual([]);
  });
});
