// Every photo belonging to one customer shares an identical prefix of
// "<identifier>_<date> <time>_<suffix>" -- they were all sent/exported in
// one batch, so the timestamp (down to the second) is byte-identical
// across that customer's files, while <identifier> varies wildly (a phone
// number, a nickname, a real name) and <suffix> is per-file (a camera
// filename, a random hash, or a descriptive label like "passport_01").
const GROUP_KEY_RE = /^(.+?_\d{4}-\d{2}-\d{2}[ _]\d{2}\.\d{2}\.\d{2})_/;
const IDENTIFIER_RE = /^(.+)_\d{4}-\d{2}-\d{2}[ _]\d{2}\.\d{2}\.\d{2}$/;

export function groupKeyForFilename(filename: string): string {
  const match = GROUP_KEY_RE.exec(filename);
  if (match) return match[1];
  // No shared-batch timestamp found -- fall back to the filename minus its
  // extension, so an unrecognized file becomes its own singleton group
  // rather than silently merging into an unrelated one.
  const ext = filename.lastIndexOf(".");
  return ext > 0 ? filename.slice(0, ext) : filename;
}

// The identifier portion alone (e.g. "Aamir" from "Aamir_2026-08-31
// 22.30.37") -- used as the folder-name fallback when passport-name
// detection doesn't find anything usable.
export function identifierFromGroupKey(groupKey: string): string {
  const match = IDENTIFIER_RE.exec(groupKey);
  return match ? match[1] : groupKey;
}

export function groupFilenames(filenames: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const name of filenames) {
    const key = groupKeyForFilename(name);
    const list = groups.get(key);
    if (list) {
      list.push(name);
    } else {
      groups.set(key, [name]);
    }
  }
  return groups;
}

// Fast path: most groups already have a file whose name says what it is
// (e.g. "..._passport_01.jpg"), which is free and far more reliable than
// running OCR to guess.
export function pickPassportCandidateByFilename(files: string[]): string | null {
  const matches = files.filter((f) => /passport/i.test(f)).sort();
  return matches[0] ?? null;
}
