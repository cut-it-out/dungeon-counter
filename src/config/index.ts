import type { EconomyConfig } from './types';
import { validateConfig } from './validate';

// Config selection (GDD §5, plan S9). Every config file in this folder is loaded and validated,
// so an invalid file fails at startup instead of soft-locking a run.
const modules = import.meta.glob<{ default: EconomyConfig }>('./*.json', { eager: true });
export const CONFIGS: EconomyConfig[] = Object.values(modules).map((m) => validateConfig(m.default));

// true: with no ?config=, the revised config loads. Set by my direction in Session 9, before played
// runs on the revision (now challenge-v4, see balancing/notes.md); ?config=baseline still plays challenge-v1.
export const REVISED_ACCEPTED = true;

// ?config= aliases; "revised" is the newest revision candidate (Session 9). Any full id also
// works (?config=challenge-v2), and the full id is what saves and CSV rows carry.
const URL_NAMES: Record<string, string> = { baseline: 'challenge-v1', revised: 'challenge-v4' };

export function selectConfig(
  search: string,
  configs: EconomyConfig[] = CONFIGS,
  revisedAccepted: boolean = REVISED_ACCEPTED,
): { config: EconomyConfig; notice: string | null } {
  const byId = (id: string) => configs.find((c) => c.id === id);
  const baseline = byId('challenge-v1');
  if (!baseline) throw new Error('challenge-v1.json is missing from src/config/');
  const fallback = (revisedAccepted && byId(URL_NAMES.revised)) || baseline;

  const requested = new URLSearchParams(search).get('config');
  if (requested === null) return { config: fallback, notice: null };
  const config = byId(URL_NAMES[requested] ?? requested);
  if (config) return { config, notice: null };
  // Visible, so an evidence run is never played on the wrong config by accident.
  return { config: fallback, notice: `No config "${requested}" here; playing ${fallback.id}.` };
}
