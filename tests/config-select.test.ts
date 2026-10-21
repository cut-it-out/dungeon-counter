import { describe, expect, it } from 'vitest';
import challenge from '../src/config/challenge-v1.json';
import { CONFIGS, REVISED_ACCEPTED, selectConfig } from '../src/config/index';
import type { EconomyConfig } from '../src/config/types';

const base = challenge as EconomyConfig;
const revised: EconomyConfig = { ...base, id: 'challenge-v2', upgradeBaseCost: 40 };

describe('config selection', () => {
  it('loads and validates the config files, challenge-v1 included', () => {
    expect(CONFIGS.map((c) => c.id)).toContain('challenge-v1');
  });

  it('defaults to challenge-v1 while challenge-v2 is not accepted', () => {
    expect(REVISED_ACCEPTED).toBe(false);
    expect(selectConfig('', [base, revised], false)).toEqual({ config: base, notice: null });
  });

  it('defaults to challenge-v2 once it exists and is accepted', () => {
    expect(selectConfig('', [base, revised], true).config.id).toBe('challenge-v2');
    expect(selectConfig('', [base], true).config.id).toBe('challenge-v1');
  });

  it('?config=baseline and ?config=revised select explicitly', () => {
    expect(selectConfig('?config=baseline', [base, revised], true).config.id).toBe('challenge-v1');
    expect(selectConfig('?config=revised', [base, revised], false).config.id).toBe('challenge-v2');
  });

  it('a missing or unknown config falls back to the default with a notice', () => {
    expect(selectConfig('?config=revised', [base], false)).toEqual({
      config: base,
      notice: 'No config "revised" here; playing challenge-v1.',
    });
    expect(selectConfig('?config=bogus', [base, revised], false).notice).toBe('No config "bogus" here; playing challenge-v1.');
  });
});
