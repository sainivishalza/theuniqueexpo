// Decides which picture is which document, from what is written on it. Used when the Excel file cannot say (several uploads
// carry the same file name). Pure functions: the text comes from the browser's text reader, so this can be tested on its own.
//
// Each picture gets a score for each document it might be; then the best way of giving every document one picture is chosen
// (a picture can serve only one document). Anything unsure is reported as "check" so the admin looks at it.

export const CLASSIFIED_SLOTS = ["passportFront", "visaPage", "businessCard", "cantonFairCard", "buyerPhoto"] as const;
export type ClassifiedSlot = (typeof CLASSIFIED_SLOTS)[number];

export interface PictureFacts {
  id: number;
  // Everything the text reader found on the picture.
  text: string;
  // A QR code was found on it.
  hasQr: boolean;
  width: number;
  height: number;
}

export interface PersonFacts {
  // Used to recognise the passport and visa, which both carry the passport number.
  passportNumber: string;
}

const compact = (text: string) => text.toUpperCase().replace(/[^A-Z0-9<«]/g, "");

// The passport number, allowing the odd misread character: any run of all but two characters of it counts.
function mentionsPassportNumber(text: string, passportNumber: string): boolean {
  const number = compact(passportNumber).replace(/[<«]/g, "");
  if (number.length < 6) return false;
  const haystack = compact(text);
  const window = Math.max(6, number.length - 2);
  for (let i = 0; i + window <= number.length; i++) {
    if (haystack.includes(number.slice(i, i + window))) return true;
  }
  return false;
}

export function scorePicture(picture: PictureFacts, person: PersonFacts): Record<ClassifiedSlot, number> {
  const upper = picture.text.toUpperCase();
  const dense = compact(picture.text);
  const has = (re: RegExp) => re.test(upper);
  const letters = dense.length;
  const portrait = picture.height > picture.width * 1.15;
  const withNumber = mentionsPassportNumber(picture.text, person.passportNumber);

  // A residence permit / visa has its own machine-readable lines starting R< or V<; a passport's start P<.
  const visaLine = has(/[RV][<«]\s*CHN/) || /[RV][<«]CHN/.test(dense);
  const passportLine = has(/\bP[<«]\s*[A-Z]{3}/) || /P[<«][A-Z]{3}[A-Z]/.test(dense);
  const passportWords = has(/PASSPORT|PASAPORTE|ПАСПОРТ|护照|SURNAME|GIVEN NAMES|DATE OF EXPIRY|PLACE OF BIRTH|AUTHORITY|DATE OF ISSUE|FEDERATION|NATIONALITY/);
  const visaWords = has(/RESIDENCE|CATEGORY|ENTRIES|DURATION OF STAY|PLACE OF ISSUE|REPUBLIC OF CHINA|PURPOSE FOR|签证|居留|VISA|PERMIT/);
  const badgeNumber = has(/A9\d{13,15}/) || /A9\d{13,15}/.test(dense);
  const badgeWords = has(/CHINA IMPORT AND EXPORT FAIR|CANTON FAIR|广交会|BUYER|采购商|OVERSEAS|BADGE|RECEIPT|境外/);
  const email = has(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/) || /@/.test(picture.text);
  const contactWords = has(/WHATSAPP|WECHAT|WEIXIN|\bTEL\b|\bMOB|PHONE|EMAIL|E-MAIL|微信|电话|手机/) || /\+\d{2,3}[\s-]?\d{3}/.test(picture.text);
  const jobWords = has(/MANAGER|DIRECTOR|\bCEO\b|SALES|EXPORT|TRADING|\bCO\.?,? ?LTD|\bLLC\b|COMPANY|INTERNATIONAL|FOUNDER|GENERAL|PRESIDENT|OWNER/);

  let passport = 0;
  if (passportLine) passport += 0.55;
  if (passportWords) passport += 0.4;
  if (withNumber && !visaLine) passport += 0.15;
  if (visaLine) passport -= 0.5;
  if (visaWords && !passportWords) passport -= 0.2;

  let visa = 0;
  if (visaLine) visa += 0.7;
  if (visaWords) visa += 0.35;
  if (withNumber && (visaLine || visaWords)) visa += 0.1;
  if (passportLine && !visaLine) visa -= 0.4;

  let badge = 0;
  if (badgeNumber) badge += 0.65;
  if (badgeWords) badge += 0.45;
  if (picture.hasQr) badge += 0.15;
  if (portrait) badge += 0.05;

  let card = 0;
  if (email) card += 0.4;
  if (contactWords) card += 0.3;
  if (jobWords) card += 0.2;
  if (passportWords || visaLine || badgeNumber) card -= 0.4;
  if (picture.hasQr && !email && !contactWords) card -= 0.05;

  // A portrait photo carries hardly any writing; it is mostly what is left after the others are placed.
  let photo = letters < 60 ? 0.3 : letters < 160 ? 0.15 : 0.05;
  if (portrait && picture.width / picture.height > 0.55 && picture.width / picture.height < 0.9) photo += 0.05;
  if (passportLine || visaLine || badgeNumber || email) photo -= 0.3;

  return {
    passportFront: Math.max(0, passport),
    visaPage: Math.max(0, visa),
    businessCard: Math.max(0, card),
    cantonFairCard: Math.max(0, badge),
    buyerPhoto: Math.max(0, photo),
  };
}

export interface Assignment {
  slot: string;
  imageId: number | null;
  // 0 to 1.
  score: number;
  // The admin should look at this one.
  check: boolean;
}

// The best way to give every open slot one picture, each picture used at most once.
export function assignPictures(slots: string[], pictures: PictureFacts[], person: PersonFacts): Assignment[] {
  const scores = pictures.map((p) => scorePicture(p, person) as Record<string, number>);
  const slotScore = (picture: number, slot: string) => scores[picture][slot] ?? 0;

  let best: { total: number; picks: (number | null)[] } = { total: -1, picks: slots.map(() => null) };
  const picks: (number | null)[] = slots.map(() => null);
  const used = new Set<number>();
  function search(slotIndex: number, total: number) {
    if (slotIndex === slots.length) {
      if (total > best.total) best = { total, picks: [...picks] };
      return;
    }
    for (let i = 0; i < pictures.length; i++) {
      if (used.has(i)) continue;
      used.add(i);
      picks[slotIndex] = i;
      search(slotIndex + 1, total + slotScore(i, slots[slotIndex]));
      used.delete(i);
    }
    // A slot may stay empty when there are fewer pictures than slots.
    if (pictures.length < slots.length) {
      picks[slotIndex] = null;
      search(slotIndex + 1, total);
    }
  }
  if (pictures.length > 0 && pictures.length <= 9 && slots.length <= 8) search(0, 0);

  return slots.map((slot, k) => {
    const pick = best.picks[k];
    if (pick === null || pick === undefined) return { slot, imageId: null, score: 0, check: true };
    const score = Math.min(1, slotScore(pick, slot));
    // Unsure when the picture hardly looks like this document, or another picture looks about as much like it.
    const rival = Math.max(0, ...pictures.map((_, i) => (i === pick ? 0 : slotScore(i, slot))));
    return { slot, imageId: pictures[pick].id, score, check: score < 0.3 || score - rival < 0.1 };
  });
}
