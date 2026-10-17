/**
 * Deterministic checks the agents run around every model call. The prompts ask
 * the model to behave; these make sure it did. Cue lists cover English, Roman
 * Urdu and Urdu script, and are kept specific on purpose: a false "sensitive"
 * only makes Birdy gentler, but a false "private info" throws a good question away.
 */

/** Lowercase, Urdu diacritics and tatweel removed, punctuation to spaces, Urdu digits to ASCII. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function hasCue(text: string, cues: readonly string[]): boolean {
  const t = ` ${normalize(text)} `;
  return cues.some((cue) => t.includes(` ${normalize(cue)}`));
}

/** Grief, loss, 1947 violence. */
const SENSITIVE_CUES = [
  "passed away", "died", "death", "killed", "murdered", "riot", "riots", "massacre", "blood", "corpse",
  "funeral", "crying", "tears", "never saw them again",
  "intiqal", "faut ho", "qatal", "fasad", "khoon", "laash", "aansu", "rona aa", "bichhar",
  "انتقال", "فوت", "وفات", "قتل", "فساد", "خون", "لاش", "آنسو", "رونا", "رو پڑ", "بچھڑ", "جنازہ", "مار دیا", "مار ڈالا", "جلا دیا",
] as const;

/** The elder asking to stop or rest. */
const TIRED_CUES = [
  "i am tired", "i'm tired", "im tired", "that's enough", "thats enough", "let's stop", "lets stop", "need rest",
  "thak gaya", "thak gayi", "thak gai", "bas karo", "bas karein", "kafi hai", "phir kabhi", "aaram karna",
  "تھک گیا", "تھک گئی", "تھک گئ", "بس کرو", "بس کریں", "کافی ہے", "پھر کبھی", "آرام کرنا",
] as const;

/** Things Birdy must never ask for. Matched against Birdy's own question, not the elder's answer. */
const PRIVATE_CUES = [
  "phone number", "mobile number", "cnic", "id card", "identity card", "home address", "your address",
  "bank account", "account number", "password", "pin code", "salary", "how much money",
  "فون نمبر", "موبائل نمبر", "شناختی کارڈ", "گھر کا پتہ", "ایڈریس", "بینک", "اکاؤنٹ", "پاس ورڈ", "تنخواہ",
] as const;

export function soundsSensitive(text: string): boolean {
  return hasCue(text, SENSITIVE_CUES);
}

export function soundsTired(text: string): boolean {
  return hasCue(text, TIRED_CUES);
}

export function asksForPrivateInfo(question: string): boolean {
  return hasCue(question, PRIVATE_CUES);
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Question marks in Latin and Urdu script; more than one means two questions at once. */
export function questionMarks(text: string): number {
  return (text.match(/[?؟]/g) ?? []).length;
}

/**
 * Transcripts are data, not instructions. Strip control characters and the
 * fence markers we wrap them in, so an answer can't close its own fence and
 * pretend to be the system.
 */
export function asData(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ")
    .replace(/<<<|>>>/g, " ")
    .trim();
}

/** A plain string, trimmed and bounded; anything else becomes "". */
export function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
