import type { EconomyConfig } from './types';
import { validateConfig } from './validate';

// Config selection (GDD §5, plan S9). Every config file in this folder is loaded and validated,
// so an invalid file fails at startup instead of soft-locking a run.
const modules = import.meta.glob<{ default: EconomyConfig }>('./*.json', { eager: true });
export const CONFIGS: EconomyConfig[] = Object.values(modules).map((m) => validateConfig(m.default));

// The public default switches to revised-v1 only once balancing/notes.md marks it accepted
// after played runs. Flip this together with that note.
export const REVISED_ACCEPTED = false;

// ?config= values; the full id is what saves and CSV rows carry.
const URL_NAMES: Record<string, string> = { baseline: 'baseline-v1', revised: 'revised-v1' };

export function selectConfig(
  search: string,
  configs: EconomyConfig[] = CONFIGS,
  revisedAccepted: boolean = REVISED_ACCEPTED,
): { config: EconomyConfig; notice: string | null } {
  const byId = (id: string) => configs.find((c) => c.id === id);
  const baseline = byId('baseline-v1');
  if (!baseline) throw new Error('baseline-v1.json is missing from src/config/');
  const fallback = (revisedAccepted && byId('revised-v1')) || baseline;

  const requested = new URLSearchParams(search).get('config');
  if (requested === null) return { config: fallback, notice: null };
  const config = URL_NAMES[requested] ? byId(URL_NAMES[requested]) : undefined;
  if (config) return { config, notice: null };
  // Visible, so an evidence run is never played on the wrong config by accident.
  return { config: fallback, notice: `No config "${requested}" here; playing ${fallback.id}.` };
}
