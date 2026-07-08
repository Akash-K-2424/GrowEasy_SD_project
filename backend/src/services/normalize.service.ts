import type { AiRowExtraction } from "../schemas/crm.schema";

/**
 * Deterministic post-extraction enforcement of the spec's AI rules. The prompt
 * asks the model to follow these, but model output can't be trusted to comply
 * 100% of the time -- so every rule that CAN be checked in code IS checked here,
 * after every extraction, regardless of provider:
 *
 *   Rule 3: created_at must be parseable by `new Date(created_at)`.
 *   Rule 5: first email/mobile wins; the rest are preserved in crm_note.
 *   Rule 6: every field stays a single CSV line (newlines escaped as literal \n).
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Within one number: digits with cosmetic spaces/parens/dots/hyphens.
const PHONE_RE = /\+?\d[\d\s().-]{5,}\d/;
// Between numbers: explicit separators only, so "98765 43210" stays one number
// but "98765 43210 / 9123456789" splits into two.
const PHONE_SEPARATOR_RE = /[/,;|&]|\bor\b/i;

function extractPhones(value: string): string[] {
  return value
    .split(PHONE_SEPARATOR_RE)
    .map((part) => part.match(PHONE_RE)?.[0])
    .filter((phone): phone is string => Boolean(phone));
}

/** Escapes raw line breaks to the literal two characters "\n" (spec rule 6). */
export function toSingleLine(value: string): string {
  return value.replace(/\r\n|\r|\n/g, "\\n").trim();
}

function appendNote(note: string, addition: string): string {
  if (!addition) return note;
  return note ? `${note}; ${addition}` : addition;
}

function isParseableDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

/**
 * Rescues unambiguous day-first dates (DD/MM/YYYY or DD-MM-YYYY where DD > 12)
 * that `new Date()` rejects, by rearranging them to ISO. Ambiguous dates that
 * `new Date()` already accepts (e.g. 05/12/2026, read as May 12 US-style) are
 * left untouched -- the spec only requires parseability, and second-guessing
 * them would silently change data.
 */
function rescueDayFirstDate(value: string): string | null {
  const m = value.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}:\d{2}(?::\d{2})?))?$/
  );
  if (!m) return null;
  const [, dayStr, monthStr, year, time] = m;
  const day = Number(dayStr);
  const month = Number(monthStr);
  if (day <= 12 || day > 31 || month < 1 || month > 12) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return time ? `${iso} ${time}` : iso;
}

function normalizeCreatedAt(row: AiRowExtraction): void {
  if (!row.created_at || isParseableDate(row.created_at)) return;
  const rescued = rescueDayFirstDate(row.created_at);
  if (rescued && isParseableDate(rescued)) {
    row.created_at = rescued;
    return;
  }
  // Unusable as a date, but still potentially useful information (rule 4).
  row.crm_note = appendNote(row.crm_note, `Original created_at: ${row.created_at}`);
  row.created_at = "";
}

function normalizeEmails(row: AiRowExtraction): void {
  if (!row.email) return;
  const [first, ...rest] = row.email.match(EMAIL_RE) ?? [];
  if (!first) {
    // Non-empty but not a usable email: keep the info, keep the skip rule honest.
    row.crm_note = appendNote(row.crm_note, `Unparsed email: ${row.email}`);
    row.email = "";
    return;
  }
  row.email = first;
  if (rest.length > 0) {
    row.crm_note = appendNote(row.crm_note, `Additional emails: ${rest.join(", ")}`);
  }
}

function normalizeMobiles(row: AiRowExtraction): void {
  if (!row.mobile_without_country_code) return;
  const [first, ...rest] = extractPhones(row.mobile_without_country_code);
  if (!first) {
    row.crm_note = appendNote(
      row.crm_note,
      `Unparsed mobile: ${row.mobile_without_country_code}`
    );
    row.mobile_without_country_code = "";
    return;
  }

  let digits = first.replace(/\D/g, "");
  // Split a 91 prefix out of a 12-digit number when it's unambiguous: either an
  // explicit "+91", or "91" followed by a valid Indian mobile (starts 6-9).
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    digits = digits.slice(2);
    if (!row.country_code) row.country_code = "+91";
  }
  row.mobile_without_country_code = digits;
  // Mirror of the prompt's rule for plain 10-digit Indian mobiles: this is an
  // Indian CRM, so a bare 10-digit number starting 6-9 defaults to +91.
  if (!row.country_code && /^[6-9]\d{9}$/.test(digits)) {
    row.country_code = "+91";
  }

  if (rest.length > 0) {
    const extras = rest.map((p) => p.replace(/\D/g, "")).join(", ");
    row.crm_note = appendNote(row.crm_note, `Additional mobiles: ${extras}`);
  }
}

/** Applies all deterministic spec rules to one extracted row. Pure function. */
export function normalizeExtraction(extraction: AiRowExtraction): AiRowExtraction {
  const row = Object.fromEntries(
    Object.entries(extraction).map(([key, value]) => [key, toSingleLine(value as string)])
  ) as AiRowExtraction;

  normalizeEmails(row);
  normalizeMobiles(row);
  normalizeCreatedAt(row);

  return row;
}
