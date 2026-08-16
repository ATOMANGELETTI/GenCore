// Shared helpers for GenCore Cursor hook scripts.
// Not itself a hook entry — imported by the hook scripts in this folder.

export async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function writeJson(obj) {
  process.stdout.write(JSON.stringify(obj ?? {}));
}
