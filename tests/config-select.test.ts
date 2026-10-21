import { describe, expect, it } from 'vitest';
import baseline from '../src/config/baseline-v1.json';
import { CONFIGS, REVISED_ACCEPTED, selectConfig } from '../src/config/index';
import type { EconomyConfig } from '../src/config/types';

const base = baseline as EconomyConfig;
const revised: EconomyConfig = { ...base, id: 'revised-v1', upgradeBaseCost: 40 };

describe('config selection', () => {
  it('loads and validates the config files, baseline included', () => {
    expect(CONFIGS.map((c) => c.id)).toContain('baseline-v1');
  });

  it('defaults to baseline while revised-v1 is not accepted', () => {
    expect(REVISED_ACCEPTED).toBe(false);
    expect(selectConfig('', [base, revised], false)).toEqual({ config: base, notice: null });
  });

  it('defaults to revised-v1 once it exists and is accepted', () => {
    expect(selectConfig('', [base, revised], true).config.id).toBe('revised-v1');
    expect(selectConfig('', [base], true).config.id).toBe('baseline-v1');
  });

  it('?config=baseline and ?config=revised select explicitly', () => {
    expect(selectConfig('?config=baseline', [base, revised], true).config.id).toBe('baseline-v1');
    expect(selectConfig('?config=revised', [base, revised], false).config.id).toBe('revised-v1');
  });

  it('a missing or unknown config falls back to the default with a notice', () => {
    expect(selectConfig('?config=revised', [base], false)).toEqual({
      config: base,
      notice: 'No config "revised" here; playing baseline-v1.',
    });
    expect(selectConfig('?config=bogus', [base, revised], false).notice).toBe('No config "bogus" here; playing baseline-v1.');
  });
});
