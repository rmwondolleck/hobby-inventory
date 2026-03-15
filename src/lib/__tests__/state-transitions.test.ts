import {
  isValidProjectTransition,
  isValidAllocationTransition,
} from '../state-transitions';

// ─── isValidProjectTransition ─────────────────────────────────────────────────

describe('isValidProjectTransition', () => {
  it('allows idea → planned', () => {
    expect(isValidProjectTransition('idea', 'planned')).toBe(true);
  });

  it('allows idea → active', () => {
    expect(isValidProjectTransition('idea', 'active')).toBe(true);
  });

  it('allows planned → active', () => {
    expect(isValidProjectTransition('planned', 'active')).toBe(true);
  });

  it('allows planned → retired', () => {
    expect(isValidProjectTransition('planned', 'retired')).toBe(true);
  });

  it('allows active → deployed', () => {
    expect(isValidProjectTransition('active', 'deployed')).toBe(true);
  });

  it('allows active → retired', () => {
    expect(isValidProjectTransition('active', 'retired')).toBe(true);
  });

  it('allows deployed → retired', () => {
    expect(isValidProjectTransition('deployed', 'retired')).toBe(true);
  });

  it('rejects retired → active (terminal state)', () => {
    expect(isValidProjectTransition('retired', 'active')).toBe(false);
  });

  it('rejects retired → idea (terminal state)', () => {
    expect(isValidProjectTransition('retired', 'idea')).toBe(false);
  });

  it('rejects deployed → active (backward transition)', () => {
    expect(isValidProjectTransition('deployed', 'active')).toBe(false);
  });

  it('rejects idea → deployed (skipping states)', () => {
    expect(isValidProjectTransition('idea', 'deployed')).toBe(false);
  });

  it('rejects same-state transition for active', () => {
    expect(isValidProjectTransition('active', 'active')).toBe(false);
  });
});

// ─── isValidAllocationTransition ─────────────────────────────────────────────

describe('isValidAllocationTransition', () => {
  it('allows reserved → in_use', () => {
    expect(isValidAllocationTransition('reserved', 'in_use')).toBe(true);
  });

  it('allows reserved → deployed', () => {
    expect(isValidAllocationTransition('reserved', 'deployed')).toBe(true);
  });

  it('allows reserved → recovered', () => {
    expect(isValidAllocationTransition('reserved', 'recovered')).toBe(true);
  });

  it('allows in_use → deployed', () => {
    expect(isValidAllocationTransition('in_use', 'deployed')).toBe(true);
  });

  it('allows in_use → recovered', () => {
    expect(isValidAllocationTransition('in_use', 'recovered')).toBe(true);
  });

  it('allows deployed → recovered', () => {
    expect(isValidAllocationTransition('deployed', 'recovered')).toBe(true);
  });

  it('rejects recovered → reserved (terminal state)', () => {
    expect(isValidAllocationTransition('recovered', 'reserved')).toBe(false);
  });

  it('rejects recovered → in_use (terminal state)', () => {
    expect(isValidAllocationTransition('recovered', 'in_use')).toBe(false);
  });

  it('rejects in_use → reserved (backward transition)', () => {
    expect(isValidAllocationTransition('in_use', 'reserved')).toBe(false);
  });

  it('rejects deployed → in_use (backward transition)', () => {
    expect(isValidAllocationTransition('deployed', 'in_use')).toBe(false);
  });

  it('rejects same-state transition for reserved', () => {
    expect(isValidAllocationTransition('reserved', 'reserved')).toBe(false);
  });
});
