import fs from "node:fs";
import path from "node:path";
import yauzl from "yauzl";
import yazl from "yazl";

// Streaming extraction (yauzl, entry-by-entry) rather than loading the
// whole archive into memory -- this tool is explicitly sized for zips up
// to ~2GB. Flattens every entry to its basename: these zips are exported
// flat (confirmed from the actual input), and flattening also closes the
// zip-slip path-traversal hole for free (path.basename strips any "../"
// or directory components in a maliciously-crafted entry name).
export async function extractZip(zipPath: string, destDir: string): Promise<string[]> {
  await fs.promises.mkdir(destDir, { recursive: true });
  const extracted: string[] = [];

  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr || !zipfile) {
        reject(openErr || new Error("Failed to open zip"));
        return;
      }

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        const safeName = path.basename(entry.fileName);
        if (!safeName) {
          zipfile.readEntry();
          return;
        }
        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            reject(streamErr || new Error(`Failed to read zip entry ${entry.fileName}`));
            return;
          }
          const destPath = path.join(destDir, safeName);
          const writeStream = fs.createWriteStream(destPath);
          readStream.pipe(writeStream);
          writeStream.on("finish", () => {
            extracted.push(safeName);
            zipfile.readEntry();
          });
          writeStream.on("error", reject);
        });
      });
      zipfile.on("end", () => resolve(extracted));
      zipfile.on("error", reject);
    });
  });
}

export interface ZipGroupPlan {
  folderName: string;
  files: string[];
}

function sanitizeFolderName(name: string): string {
  // Strip characters that break on Windows/zip extractors (path
  // separators, reserved chars) in case a detected/confirmed name ever
  // contains one.
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || "Unknown";
}

export async function buildZip(sourceDir: string, groups: ZipGroupPlan[], outPath: string): Promise<void> {
  const zipfile = new yazl.ZipFile();
  const usedFolderNames = new Map<string, number>();

  for (const group of groups) {
    let folderName = sanitizeFolderName(group.folderName);
    // Two customers can legitimately end up with the same detected name
    // (or both fall back to "Unknown") -- disambiguate rather than
    // silently merging their files into one folder.
    const count = usedFolderNames.get(folderName) ?? 0;
    usedFolderNames.set(folderName, count + 1);
    if (count > 0) folderName = `${folderName} (${count + 1})`;

    for (const file of group.files) {
      zipfile.addFile(path.join(sourceDir, file), `${folderName}/${file}`);
    }
  }

  await new Promise<void>((resolve, reject) => {
    const out = fs.createWriteStream(outPath);
    out.on("close", resolve);
    out.on("error", reject);
    zipfile.outputStream.pipe(out);
    zipfile.end();
  });
}
