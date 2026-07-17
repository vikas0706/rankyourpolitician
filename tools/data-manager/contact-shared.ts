/**
 * Shared cleaning rules for published contact details (enrich-contacts for MPs,
 * import-mla-contacts for state assemblies). Both importers MUST agree on what
 * a publishable email/phone looks like, so the rules live in one place.
 *
 * "Missing beats wrong" is the whole design: a token that does not cleanly
 * parse as a reachable address/number is dropped, never repaired by guesswork.
 *
 * OFFICE CHANNELS ONLY. Directories mix the member's personal mobile into the
 * entry. Republishing it is arguably lawful (DPDP Act 2023 s.3(c) exempts data
 * made publicly available under a legal obligation) but it multiplies
 * harassment exposure for zero civic gain over the office channels, so
 * mobile numbers are NEVER kept - only fixed office/STD landlines and the
 * published email addresses. Do not weaken this in one importer without the
 * others; the validator enforces it dataset-wide.
 */

export const EMAIL_RE = /^[a-z0-9][a-z0-9._%+-]*@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/;
/** Official parliamentary/government addresses lead the list - they outlive the personal inbox. */
const OFFICIAL_DOMAIN_RE = /@(?:[a-z0-9.-]+\.)?(?:sansad\.in|sansad\.nic\.in|nic\.in|gov\.in)$/;

/** De-obfuscate ("wahab[dot]pv[at]sansad[dot]nic[dot]in"), split multi-address
 *  cells, validate each, dedupe, official addresses first. */
export function cleanEmails(raw: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    if (!r) continue;
    const decoded = String(r)
      .toLowerCase()
      .replace(/[\[\(]\s*at\s*[\]\)]/g, '@')
      .replace(/[\[\(]\s*dot\s*[\]\)]/g, '.');
    for (let tok of decoded.split(/[,;\s]+/)) {
      tok = tok.replace(/^[^a-z0-9]+|[^a-z]+$/g, ''); // stray punctuation around the cell
      if (!EMAIL_RE.test(tok) || seen.has(tok)) continue;
      seen.add(tok);
      out.push(tok);
    }
  }
  return out.sort((a, b) => Number(OFFICIAL_DOMAIN_RE.test(b)) - Number(OFFICIAL_DOMAIN_RE.test(a)));
}

/**
 * Extract OFFICE landlines from a directory phone cell; mobiles are dropped
 * (see the policy note above). `delhiField` marks cells the source itself
 * labels as Delhi numbers (LS delhiPhone, RS localTele): bare 8-digit
 * landlines there are published minus their 011 STD code, which we restore so
 * the number works outside Delhi. Elsewhere a bare local landline is dropped -
 * its STD code is not derivable without guessing.
 */
export function cleanPhones(cells: { value?: string | null; delhiField?: boolean }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { value, delhiField } of cells) {
    if (!value) continue;
    // Fax numbers are published for paperwork, not for reaching out.
    const noFax = String(value).replace(/(?:tele)?fax\s*:?\s*[\d\s()+-]+/gi, ' ');
    for (const m of noFax.matchAll(/(?:\+91[-\s]?)?\d[\d\s-]{6,14}\d/g)) {
      const raw = m[0].replace(/\s+/g, '').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
      const digits = raw.replace(/[^\d]/g, '');
      const hyphenAt = raw.indexOf('-');
      let display: string | null = null;
      // A landline is 0-led (STD trunk form), 10-11 digits. Digits alone cannot
      // separate 0891-2754xxx (Vizag landline) from 0-9013180198 (trunk-dialled
      // mobile) because STD codes span 01x-09xx, so the source's own printing
      // decides: an STD hyphen (at least "0xx-") marks a landline; unhyphenated
      // is accepted only when the post-0 digits cannot be a mobile (mobiles are
      // [6-9]-led). Everything mobile-shaped is personal - never kept.
      if (/^0\d{9,10}$/.test(digits) && (hyphenAt >= 3 || (hyphenAt === -1 && /^0[1-5]/.test(digits)))) {
        display = raw; // keep the source's own hyphenation - never invent one
      } else if (delhiField && /^2\d{7}$/.test(digits)) display = `011-${digits}`;
      if (!display) continue;
      const key = display.replace(/\D/g, '');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(display);
    }
  }
  return out.slice(0, 3); // the office line(s) - never a wall of numbers
}
