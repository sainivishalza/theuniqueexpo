import { createWorker, type Worker } from "tesseract.js";

// A passport's printed name (and its MRZ transliteration) is always in
// Latin script even when the rest of the document isn't, so a single
// English-trained worker is enough -- and reusing one worker across an
// entire batch avoids re-initializing tesseract's model for every image.
export async function createOcrWorker(): Promise<Worker> {
  return createWorker("eng");
}

export async function ocrImage(worker: Worker, filePath: string): Promise<string> {
  const { data } = await worker.recognize(filePath);
  return data.text;
}
