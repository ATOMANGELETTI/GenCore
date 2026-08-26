import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.join(import.meta.dirname, "../..");

const TILE =
  /<rect\b[^>]*\bx="96"[^>]*\by="96"[^>]*\bwidth="832"[^>]*\bheight="832"[^>]*\brx="184"[^>]*\bry="184"/;
const VIEWBOX = /viewBox="0 0 1024 1024"/;
const ALLOWED_HEX = new Set(["#2e3440", "#88c0d0"]);

const APPS = ["terminal", "explorer"];
const KINDS = ["icon", "tray"];
const PNG_SIZES = [
  ["32x32.png", 32, 32],
  ["128x128.png", 128, 128],
  ["128x128@2x.png", 256, 256],
  ["tray.png", 32, 32],
];
const ICO_MAGIC = Buffer.from([0x00, 0x00, 0x01, 0x00]);

function svgRel(app, kind) {
  return `apps/${app}/src-tauri/icons/${kind}.svg`;
}

function read(rel) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function readBytes(rel) {
  return readFileSync(path.join(ROOT, rel));
}

function pngIhdr(rel) {
  const buf = readBytes(rel);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function iconRel(app, name) {
  return `apps/${app}/src-tauri/icons/${name}`;
}

function hexes(svg) {
  return [...svg.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toLowerCase());
}

function glyphPaths(svg) {
  const d = [...svg.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)].map((m) => m[1]);
  const rects = [...svg.matchAll(/<rect\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((rect) => !TILE.test(rect));
  return { d, rects };
}

function hasForbidden(svg) {
  return /linearGradient|radialGradient|filter=|<filter/.test(svg);
}

test("each app icon and tray SVG exists with a 1024 viewBox", () => {
  for (const app of APPS) {
    for (const kind of KINDS) {
      const svg = read(svgRel(app, kind));
      assert.match(svg, VIEWBOX, `${app} ${kind}.svg`);
    }
  }
});

test("every hex in each SVG is Nord nord0 or nord8", () => {
  for (const app of APPS) {
    for (const kind of KINDS) {
      const found = hexes(read(svgRel(app, kind)));
      for (const hex of found) {
        assert.ok(ALLOWED_HEX.has(hex), `${app} ${kind}.svg has ${hex}`);
      }
    }
  }
});

test("icon.svg files use the Polar Night tile, Frost palette, and no gradients", () => {
  for (const app of APPS) {
    const svg = read(svgRel(app, "icon"));
    const found = hexes(svg);
    assert.match(svg, TILE, `${app} icon.svg`);
    assert.ok(found.includes("#2e3440"), `${app} icon.svg`);
    assert.ok(found.includes("#88c0d0"), `${app} icon.svg`);
    assert.equal(hasForbidden(svg), false, `${app} icon.svg`);
  }
});

test("tray.svg files are glyph-only Frost on a transparent canvas", () => {
  for (const app of APPS) {
    const svg = read(svgRel(app, "tray"));
    const found = hexes(svg);
    assert.equal(found.includes("#2e3440"), false, `${app} tray.svg`);
    assert.doesNotMatch(svg, TILE, `${app} tray.svg`);
    assert.ok(found.includes("#88c0d0"), `${app} tray.svg`);
    assert.equal(hasForbidden(svg), false, `${app} tray.svg`);
  }
});

test("each app shares the same glyph geometry between icon.svg and tray.svg", () => {
  for (const app of APPS) {
    assert.deepEqual(
      glyphPaths(read(svgRel(app, "icon"))),
      glyphPaths(read(svgRel(app, "tray"))),
      app,
    );
  }
});

test("Windows PNG rasters match IHDR width and height", () => {
  for (const app of APPS) {
    for (const [name, width, height] of PNG_SIZES) {
      assert.deepEqual(pngIhdr(iconRel(app, name)), { width, height }, `${app} ${name}`);
    }
  }
});

test("icon.ico files exist and start with ICO magic", () => {
  for (const app of APPS) {
    const buf = readBytes(iconRel(app, "icon.ico"));
    assert.ok(buf.byteLength >= 4, `${app} icon.ico`);
    assert.deepEqual(buf.subarray(0, 4), ICO_MAGIC, `${app} icon.ico`);
  }
});

test("generate-app-icons.ps1 rasters app icons from ui-kit favicon_snow-storm.png", () => {
  const script = read("scripts/generate-app-icons.ps1");
  assert.match(
    script,
    /packages\/ui-kit\/src\/assets\/icons\/favicon\/\$Name\/favicon_snow-storm\.png/,
  );
  assert.doesNotMatch(script, /tauri icon \$IconSvg/);
});
