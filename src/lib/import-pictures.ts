// Finds, for each person in the Excel file, their pictures in the ZIP. Runs in the browser; kept free of anything else so it can
// be tested alone.
//
// The collection form names every uploaded file "<submitter>_<date time>_<original name>". The Excel file has one column per
// document and lists the file in it. When the five file names differ, each is placed straight into its column's slot. When
// they are the same (several uploads named "picture-0_01.png", which the ZIP keeps as "picture-0_01.png" and
// "picture-0_01（1）.png" ...) the column no longer says which file is which, so those pictures are left for the classifier.

export const IMAGE_NAME_RE = /\.(png|jpe?g|webp|gif|bmp|tiff?|heic|heif)$/i;

export interface PictureRef {
  slot: string;
  file: string;
}

export interface ZipImage {
  id: number;
  path: string;
  // The file name alone, as written in the ZIP.
  name: string;
  // The same, compared loosely: letters of any width and case, spaces collapsed.
  key: string;
  // And without the "(1)" the ZIP adds to a repeated name.
  dupKey: string;
  // "<submitter>|<date time>", shared by everything one person uploaded in one go.
  group: string;
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function normName(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

const DUPLICATE_MARK = /\s*\(\d+\)(?=\.[a-z0-9]+$)/;
const GROUP_RE = /^(.+?)_(\d{4}-\d{2}-\d{2}[ _]\d{2}[.:]\d{2}[.:]\d{2})_/;

export function groupOf(name: string): string {
  const m = GROUP_RE.exec(normName(baseName(name)));
  return m ? `${m[1].trim()}|${m[2].replace("_", " ").replace(/:/g, ".")}` : "";
}

export function makeZipImage(id: number, path: string): ZipImage {
  const name = baseName(path);
  const key = normName(name);
  return { id, path, name, key, dupKey: key.replace(DUPLICATE_MARK, ""), group: groupOf(name) };
}

export interface ImageIndex {
  byKey: Map<string, ZipImage[]>;
  byDupKey: Map<string, ZipImage[]>;
  byGroup: Map<string, ZipImage[]>;
}

export function indexImages(images: ZipImage[]): ImageIndex {
  const add = (map: Map<string, ZipImage[]>, key: string, image: ZipImage) => {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(image);
    else map.set(key, [image]);
  };
  const index: ImageIndex = { byKey: new Map(), byDupKey: new Map(), byGroup: new Map() };
  for (const image of images) {
    add(index.byKey, image.key, image);
    add(index.byDupKey, image.dupKey, image);
    add(index.byGroup, image.group, image);
  }
  // "(1)", "(2)" ... keep the order the files were added in.
  const duplicateNumber = (image: ZipImage) => Number(/\((\d+)\)\.[a-z0-9]+$/.exec(image.key)?.[1] ?? 0);
  for (const list of index.byDupKey.values()) list.sort((a, b) => duplicateNumber(a) - duplicateNumber(b));
  return index;
}

export interface Placement {
  slot: string;
  imageId: number;
}

export interface PersonPictures {
  // Pictures whose column named their own file: placed without guessing.
  placed: Placement[];
  // Slots whose file name is shared or not found, and the pictures that may fill them. The classifier decides.
  openSlots: string[];
  candidates: number[];
  // The slots the Excel lists no picture for at all.
  groupSeen: boolean;
}

export function matchPersonPictures(pictures: PictureRef[], index: ImageIndex): PersonPictures {
  const placed: Placement[] = [];
  const used = new Set<number>();
  const openSlots: string[] = [];
  const candidates = new Set<number>();

  const keyOf = (p: PictureRef) => normName(baseName(p.file));
  const sharing = new Map<string, number>();
  for (const p of pictures) sharing.set(keyOf(p), (sharing.get(keyOf(p)) ?? 0) + 1);

  let group = "";
  for (const p of pictures) {
    const g = groupOf(p.file);
    if (g) { group = g; break; }
  }

  for (const p of pictures) {
    const key = keyOf(p);
    const exact = index.byKey.get(key) ?? [];
    if ((sharing.get(key) ?? 0) === 1 && exact.length > 0) {
      placed.push({ slot: p.slot, imageId: exact[0].id });
      used.add(exact[0].id);
    } else {
      openSlots.push(p.slot);
      // Every file the ZIP holds under this name, with or without "(1)".
      for (const image of index.byDupKey.get(key.replace(DUPLICATE_MARK, "")) ?? []) candidates.add(image.id);
    }
  }

  // A file the sheet names that the ZIP does not hold under that name: the person's other uploads are the candidates.
  const groupImages = group ? index.byGroup.get(group) ?? [] : [];
  if (openSlots.length > 0) for (const image of groupImages) candidates.add(image.id);
  return {
    placed,
    openSlots,
    candidates: [...candidates].filter((id) => !used.has(id)),
    groupSeen: groupImages.length > 0 || placed.length > 0,
  };
}
