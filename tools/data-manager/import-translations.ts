/**
 * Data-manager step: ingest the translation-workflow output and write each
 * locale file to lib/i18n/messages/<code>.json. Any locale that failed to parse
 * is skipped (the app falls back to English for it). English is the source and
 * is never overwritten.
 *
 * Usage: npx tsx tools/data-manager/import-translations.ts <path-to-output.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const MSG_DIR = resolve(ROOT, 'lib', 'i18n', 'messages');

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: npx tsx tools/data-manager/import-translations.ts <path-to-output.json>');
    process.exit(1);
  }
  const doc = JSON.parse(readFileSync(inputPath, 'utf8'));
  const locales = (doc.result ?? doc).locales || {};
  const written: string[] = [];
  const skipped: string[] = [];

  for (const [code, obj] of Object.entries(locales)) {
    if (code === 'en') continue;
    if (obj && typeof obj === 'object') {
      writeFileSync(resolve(MSG_DIR, `${code}.json`), JSON.stringify(obj, null, 2) + '\n');
      written.push(code);
    } else {
      skipped.push(code);
    }
  }
  console.log(`Wrote ${written.length} locale files: ${written.join(', ')}`);
  if (skipped.length) console.log(`Skipped (will fall back to English): ${skipped.join(', ')}`);
}

main();
