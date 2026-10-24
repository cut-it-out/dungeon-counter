import { describe, expect, it } from 'vitest';
import challenge from '../src/config/challenge-v1.json';
import { CONFIGS, REVISED_ACCEPTED, selectConfig } from '../src/config/index';
import type { EconomyConfig } from '../src/config/types';

const base = challenge as EconomyConfig;
const older: EconomyConfig = { ...base, id: 'challenge-v3', upgradeBaseCost: 45 };
const revised: EconomyConfig = { ...base, id: 'challenge-v4', upgradeBaseCost: 40 };

describe('config selection', () => {
  it('loads and validates the config files, challenge-v1 included', () => {
    expect(CONFIGS.map((c) => c.id)).toContain('challenge-v1');
  });

  it('defaults to challenge-v1 when the revised config is not the default', () => {
    expect(REVISED_ACCEPTED).toBe(true); // the revised config is the default since Session 9
    expect(selectConfig('', [base, revised], false)).toEqual({ config: base, notice: null });
  });

  it('defaults to the revised config (challenge-v4) once it exists and is accepted', () => {
    expect(selectConfig('', [base, older, revised], true).config.id).toBe('challenge-v4');
    expect(selectConfig('', [base], true).config.id).toBe('challenge-v1');
  });

  it('?config=baseline and ?config=revised select explicitly', () => {
    expect(selectConfig('?config=baseline', [base, revised], true).config.id).toBe('challenge-v1');
    expect(selectConfig('?config=revised', [base, older, revised], false).config.id).toBe('challenge-v4');
  });

  it('a missing or unknown config falls back to the default with a notice', () => {
    expect(selectConfig('?config=revised', [base], false)).toEqual({
      config: base,
      notice: 'No config "revised" here; playing challenge-v1.',
    });
    expect(selectConfig('?config=bogus', [base, revised], false).notice).toBe('No config "bogus" here; playing challenge-v1.');
  });
});

describe('config selection by full id (Session 9)', () => {
  const older: EconomyConfig = { ...base, id: 'challenge-v2' };
  const revised: EconomyConfig = { ...base, id: 'challenge-v4' };

  it('selects any loaded config by its id', () => {
    expect(selectConfig('?config=challenge-v2', [base, older, revised], false).config.id).toBe('challenge-v2');
    expect(selectConfig('?config=challenge-v4', [base, older, revised], false)).toEqual({ config: revised, notice: null });
  });

  it('reports an id that is not loaded', () => {
    expect(selectConfig('?config=challenge-v9', [base, older], false).notice).toBe('No config "challenge-v9" here; playing challenge-v1.');
  });

  it('loads every config file in src/config/', () => {
    expect(CONFIGS.map((c) => c.id).sort()).toEqual(['challenge-v1', 'challenge-v2', 'challenge-v3', 'challenge-v4']);
  });
});
