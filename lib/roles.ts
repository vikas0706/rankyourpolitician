// Maps a house to the i18n key prefix for its accountability explainer content
// (the actual text lives in the translatable dictionary under `accountability.roles.*`).
import type { House } from './types';

export function roleKeyForHouse(house: House): 'lokSabha' | 'rajyaSabha' | 'vidhanSabha' {
  switch (house) {
    case 'Rajya Sabha':
      return 'rajyaSabha';
    case 'Vidhan Sabha':
      return 'vidhanSabha';
    case 'Lok Sabha':
    default:
      return 'lokSabha';
  }
}

/** Field groups shown on the profile "Verified record" section, in order. */
export const RECORD_GROUPS: { key: string; fields: string[] }[] = [
  { key: 'background', fields: ['education', 'profession', 'age'] },
  { key: 'affidavit', fields: ['assets_total', 'liabilities_total', 'criminal_cases_declared'] },
  {
    key: 'parliamentary',
    fields: ['attendance_pct', 'questions_asked', 'debates_participated', 'private_member_bills', 'mplads_utilisation_pct'],
  },
  { key: 'experience', fields: ['terms_served', 'previous_positions'] },
];
