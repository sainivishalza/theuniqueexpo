import { listZipEntries, readZipEntry, type ZipEntry } from "./zip-reader";
import { lookAtPicture, pictureForUpload, PictureError } from "./picture-reader";
import { OcrError, startOcr, type OcrStartStatus } from "./ocr-reader";
import { assignPictures, CLASSIFIED_SLOTS, type PictureFacts } from "../import-classify";
import { IMAGE_NAME_RE, indexImages, makeZipImage, matchPersonPictures, type PictureRef } from "../import-pictures";

// Puts the pictures of a ZIP with the people of an Excel file. Everything happens in the admin's browser: the ZIP is opened where
// it is, one picture at a time, and only the pictures that are really saved are sent to the site (at most 1600 px each).

export interface PictureBuyer {
  row: number;
  name: string;
  passportNumber: string;
  pictures: PictureRef[];
}

export interface PlanImage {
  id: number;
  name: string;
  // "sheet": the Excel file names this very picture for a document. "sorted": the computer chose from what is written on it.
  origin: "sheet" | "sorted" | "other";
  check: boolean;
}

export interface PersonPlan {
  row: number;
  name: string;
  images: PlanImage[];
  // Picture id -> the document it is placed as ("" = not used).
  slots: Record<number, string>;
  // The documents the Excel file lists a picture for but none was found.
  missing: string[];
  // Somebody should look at this person's pictures.
  flagged: boolean;
}

export interface PicturePlan {
  people: PersonPlan[];
  entries: Map<number, ZipEntry>;
  stats: { placed: number; sorted: number; flagged: number; withoutPictures: number; unused: number; unreadable: number };
  // Set when the text reader could not start or stopped: the pictures were then placed without reading them.
  readerProblem: string;
}

// What the page shows while this runs.
export type PlanStatus =
  | { step: "opening" }
  | { step: "person"; done: number; total: number }
  | { step: "reader"; reader: OcrStartStatus }
  | { step: "picture"; done: number; total: number; picture: number; pictures: number };

export async function planPictures(
  zip: File,
  buyers: PictureBuyer[],
  progress: (status: PlanStatus) => void,
  cancelled: () => boolean
): Promise<PicturePlan> {
  progress({ step: "opening" });
  const all = (await listZipEntries(zip)).filter((e) => e.size > 0 && IMAGE_NAME_RE.test(e.name) && !/(^|\/)(__MACOSX|\.)/.test(e.name));
  const entries = new Map<number, ZipEntry>();
  const images = all.map((entry, id) => {
    entries.set(id, entry);
    return makeZipImage(id, entry.name);
  });
  const index = indexImages(images);
  const byId = new Map(images.map((i) => [i.id, i]));

  const people: PersonPlan[] = [];
  const claimed = new Set<number>();
  const stats = { placed: 0, sorted: 0, flagged: 0, withoutPictures: 0, unused: 0, unreadable: 0 };
  const withPictures = buyers.filter((b) => b.pictures.length > 0);
  let done = 0;
  let readerProblem = "";
  let readerReady = false;

  for (const buyer of withPictures) {
    if (cancelled()) break;
    progress({ step: "person", done: ++done, total: withPictures.length });
    const match = matchPersonPictures(buyer.pictures, index);
    const plan: PersonPlan = { row: buyer.row, name: buyer.name, images: [], slots: {}, missing: [], flagged: false };

    for (const p of match.placed) {
      plan.images.push({ id: p.imageId, name: byId.get(p.imageId)!.name, origin: "sheet", check: false });
      plan.slots[p.imageId] = p.slot;
      claimed.add(p.imageId);
      stats.placed++;
    }

    if (match.openSlots.length > 0) {
      // The Excel file cannot say which picture is which: read what is written on them.
      const facts: PictureFacts[] = [];
      const unreadable = new Set<number>();
      // The text reader starts the first time it is needed (and downloads its data then).
      if (!readerReady && !readerProblem) {
        try {
          await startOcr((reader) => progress({ step: "reader", reader }));
          readerReady = true;
        } catch (err) {
          readerProblem = err instanceof Error ? err.message : "The text reader could not start";
        }
      }
      let n = 0;
      for (const id of match.candidates) {
        if (cancelled()) break;
        progress({ step: "picture", done, total: withPictures.length, picture: ++n, pictures: match.candidates.length });
        try {
          const blob = await readZipEntry(zip, entries.get(id)!);
          const look = await lookAtPicture(blob, readerReady && !readerProblem).catch((err) => {
            // A picture the reader cannot finish in time is looked at without its writing; the reader is not trusted again.
            if (err instanceof OcrError) {
              readerProblem = err.message;
              return lookAtPicture(blob, false);
            }
            throw err;
          });
          facts.push({ id, text: look.text, hasQr: look.hasQr, width: look.width, height: look.height });
        } catch (err) {
          if (!(err instanceof PictureError)) throw err;
          unreadable.add(id);
          stats.unreadable++;
        }
      }
      const slots = match.openSlots.filter((s) => (CLASSIFIED_SLOTS as readonly string[]).includes(s));
      const result = assignPictures(slots, facts, { passportNumber: buyer.passportNumber });
      for (const a of result) {
        if (a.imageId === null) {
          plan.missing.push(a.slot);
          continue;
        }
        plan.images.push({ id: a.imageId, name: byId.get(a.imageId)!.name, origin: "sorted", check: a.check });
        plan.slots[a.imageId] = a.slot;
        claimed.add(a.imageId);
        stats.sorted++;
        if (a.check) plan.flagged = true;
      }
      // Slots the sorting does not cover (a licence, an invoice...) and anything it could not open stay open for the admin.
      for (const slot of match.openSlots.filter((s) => !slots.includes(s))) plan.missing.push(slot);
      for (const id of [...match.candidates]) {
        if (plan.images.some((i) => i.id === id)) continue;
        plan.images.push({ id, name: byId.get(id)!.name, origin: "other", check: unreadable.has(id) });
        plan.slots[id] = "";
        claimed.add(id);
        if (unreadable.has(id)) plan.flagged = true;
      }
    }
    if (plan.images.length === 0) stats.withoutPictures++;
    if (plan.missing.length > 0 && plan.images.length > 0) plan.flagged = true;
    if (plan.flagged) stats.flagged++;
    if (plan.images.length > 0) people.push(plan);
  }
  stats.unused = images.filter((i) => !claimed.has(i.id)).length;
  return { people, entries, stats, readerProblem };
}

export interface UploadJob {
  row: number;
  userId: number;
  slot: string;
  imageId: number;
}

// Sends the chosen pictures to the buyers' profiles, one at a time. Returns the ones that failed, with the reason.
export async function uploadPictures(
  zip: File,
  entries: Map<number, ZipEntry>,
  jobs: UploadJob[],
  progress: (done: number) => void
): Promise<{ job: UploadJob; reason: string }[]> {
  const failed: { job: UploadJob; reason: string }[] = [];
  let done = 0;
  for (const job of jobs) {
    try {
      const blob = await readZipEntry(zip, entries.get(job.imageId)!);
      const value = await pictureForUpload(blob);
      const res = await fetch(`/api/admin/buyer-profiles/${job.userId}/documents/${job.slot}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || `Error ${res.status}`);
    } catch (err) {
      failed.push({ job, reason: err instanceof Error ? err.message : "Failed" });
    }
    progress(++done);
  }
  return failed;
}

export async function previewOf(zip: File, entry: ZipEntry): Promise<string> {
  const blob = await readZipEntry(zip, entry);
  return (await lookAtPicture(blob, false)).thumb;
}
