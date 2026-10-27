// A spreadsheet is sometimes assembled from two sources, and some rows then sit in a different column order than the header says
// (for example rows copied from our own buyer list: the buyer number "TUE0166" comes first and pushes every other column one place
// to the right, so the "name" column holds the buyer number, the "passport" column holds the name, and so on). Reading such a row by
// its header gives wrong details. This reads it by what each value LOOKS like instead, so the right detail ends up in the right place.
// Nothing here touches the database.

export const BUYER_NUMBER_RE = /^TUE\d{3,7}$/i;

export interface RepairedRow {
  buyerNumber: string;
  name: string;
  passport: string;
  phone: string;
  wechat: string;
  email: string;
  gender: string;
  birth: string;
  nationality: string;
  visa: string;
  company: string;
  job: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIRTH_RE = /^\d{4}\s*[年\-/.]\s*\d{1,2}/;
const GENDER_RE = /^(male|female|男|女)$/i;
const CN_MOBILE_RE = /^1[3-9]\d{9}$/;
const PASSPORT_RE = /^[A-Z]{0,3}\d{6,10}[A-Z]?$/i;
const digitsOf = (s: string) => s.replace(/[\s()+\-.]/g, "");

/**
 * Re-reads one row by the look of its values. `cells` are the row's values in column order (empty ones are ignored) and `isNationality`
 * says whether a value is a country / nationality we know. Returns null when the row does not look like a person's details.
 */
export function repairShiftedRow(cells: string[], isNationality: (v: string) => boolean): RepairedRow | null {
  const left = cells.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean);
  const take = (test: (v: string) => boolean): string => {
    const i = left.findIndex(test);
    return i < 0 ? "" : left.splice(i, 1)[0];
  };
  const buyerNumber = take((v) => BUYER_NUMBER_RE.test(v)).toUpperCase();
  const email = take((v) => EMAIL_RE.test(v)).toLowerCase();
  const gender = take((v) => GENDER_RE.test(v));
  const birth = take((v) => BIRTH_RE.test(v));
  const visa = take((v) => /visa|签证/i.test(v));

  // The name: the first value made of letters (two or more) and no digits, that is not a country.
  const name = take((v) => /^[\p{L}][\p{L}\s.'\-]{2,}$/u.test(v) && !/\d/.test(v) && !isNationality(v) && !/^(ltd|co|inc)\b/i.test(v));

  // Phone: a China mobile number if there is one, otherwise the longest all-digit value.
  let phone = take((v) => CN_MOBILE_RE.test(digitsOf(v)));
  if (!phone) {
    const longest = left.filter((v) => /^\+?\d{9,15}$/.test(digitsOf(v))).sort((a, b) => digitsOf(b).length - digitsOf(a).length)[0];
    if (longest) phone = take((v) => v === longest);
  }
  // Passport: letters and digits in the usual passport shape (not the phone number).
  const passport = take((v) => PASSPORT_RE.test(digitsOf(v)) && digitsOf(v) !== digitsOf(phone));
  // WeChat ID: what is left that is a single word of letters/digits/_/-, or the same digits as the phone (then it is the phone).
  let wechat = take((v) => /^[\w\-.]{4,40}$/.test(v) && !isNationality(v) && !/^\d{4}$/.test(v));
  if (wechat && digitsOf(wechat) === digitsOf(phone)) wechat = phone;
  const nationality = take((v) => isNationality(v));
  // What is left, in order: company, then position.
  const company = left.shift() ?? "";
  const job = left.shift() ?? "";

  if (!name && !passport && !phone && !email) return null;
  return { buyerNumber, name, passport, phone, wechat, email, gender, birth, nationality, visa, company, job };
}

/**
 * "1978年02月", "1978-02", "1978/2/15", "15.02.1978" -> an ISO date. When only the year and month are known the day is set to 1 and
 * `approximate` is true, so the screen can say the day is a placeholder to be corrected later.
 */
export function parseBirth(value: string): { iso: string; approximate: boolean } | null {
  const v = value.replace(/\s+/g, "").trim();
  if (!v) return null;
  const pad = (n: string) => n.padStart(2, "0");
  let m = /^(\d{4})[年\-/.](\d{1,2})[月\-/.]?(?:(\d{1,2})日?)?$/.exec(v);
  if (m) {
    const month = Number(m[2]);
    if (month < 1 || month > 12) return null;
    const day = m[3] ? Number(m[3]) : 0;
    return { iso: `${m[1]}-${pad(m[2])}-${day ? pad(m[3]) : "01"}`, approximate: !day };
  }
  m = /^(\d{1,2})[\-/.](\d{1,2})[\-/.](\d{4})$/.exec(v);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const [day, month] = a > 12 ? [a, b] : b > 12 ? [b, a] : [a, b]; // day first when it cannot be told apart
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { iso: `${m[3]}-${pad(String(month))}-${pad(String(day))}`, approximate: false };
  }
  m = /^(\d{4})$/.exec(v);
  if (m && Number(m[1]) > 1900 && Number(m[1]) < 2100) return { iso: `${m[1]}-01-01`, approximate: true };
  return null;
}
