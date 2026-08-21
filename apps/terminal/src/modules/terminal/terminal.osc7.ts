const DRIVE_FILE_URI = /^file:\/\/[^/]*\/([A-Za-z]):\/(.*)$/;

function fileUriToWindowsPath(uri: string): string | null {
  let decoded = uri;
  try {
    decoded = decodeURI(uri);
  } catch {
    return null;
  }

  const match = DRIVE_FILE_URI.exec(decoded);
  if (!match) {
    return null;
  }

  const drive = match[1]?.toUpperCase();
  if (!drive) {
    return null;
  }

  const rest = (match[2] ?? "").replace(/\//g, "\\").replace(/\\+$/g, "");
  if (!rest) {
    return `${drive}:\\`;
  }
  return `${drive}:\\${rest}`;
}

function lastWindowsPath(matches: Iterable<string>): string | null {
  let last: string | null = null;
  for (const raw of matches) {
    const path = fileUriToWindowsPath(raw);
    if (path) {
      last = path;
    }
  }
  return last;
}

/** Scan a PTY chunk for OSC 7 (`ESC ] 7 ; file://… BEL|ST`) and return a Windows cwd. */
export function scanOsc7(chunk: string): string | null {
  if (!chunk) {
    return null;
  }

  const esc = String.fromCharCode(27);
  const bel = String.fromCharCode(7);
  const oscPaths: string[] = [];
  const osc7 = new RegExp(`${esc}\\]7;([^${bel}${esc}]+)(?:${bel}|${esc}\\\\)`, "g");
  let osc = osc7.exec(chunk);
  while (osc) {
    oscPaths.push(osc[1] ?? "");
    osc = osc7.exec(chunk);
  }
  const fromOsc = lastWindowsPath(oscPaths);
  if (fromOsc) {
    return fromOsc;
  }

  const fileUris: string[] = [];
  const fileUri = new RegExp(`file://[^\\s${bel}${esc}]*`, "g");
  let file = fileUri.exec(chunk);
  while (file) {
    fileUris.push(file[0] ?? "");
    file = fileUri.exec(chunk);
  }
  return lastWindowsPath(fileUris);
}
