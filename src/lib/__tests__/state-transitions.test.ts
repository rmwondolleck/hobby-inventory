import {
  isValidStockTransition,
  isValidProjectTransition,
  isValidAllocationTransition,
  isValidTransition,
  getValidStockTransitions,
  getValidProjectTransitions,
  getValidAllocationTransitions,
  getValidTransitions,
  getTransitionError,
  validateTransition,
  isTerminalState,
  deriveStatusFromQuantity,
} from '../state-transitions';

// ─── Stock Status Transitions ─────────────────────────────────────────────────

describe('isValidStockTransition', () => {
  it('allows in_stock → low', () => {
    expect(isValidStockTransition('in_stock', 'low')).toBe(true);
  });

  it('allows in_stock → reserved', () => {
    expect(isValidStockTransition('in_stock', 'reserved')).toBe(true);
  });

  it('allows in_stock → installed', () => {
    expect(isValidStockTransition('in_stock', 'installed')).toBe(true);
  });

  it('allows in_stock → scrapped', () => {
    expect(isValidStockTransition('in_stock', 'scrapped')).toBe(true);
  });

  it('allows in_stock → out', () => {
    expect(isValidStockTransition('in_stock', 'out')).toBe(true);
  });

  it('allows no-op transition (same state)', () => {
    expect(isValidStockTransition('in_stock', 'in_stock')).toBe(true);
    expect(isValidStockTransition('scrapped', 'scrapped')).toBe(true);
  });

  it('rejects scrapped → in_stock (terminal state)', () => {
    expect(isValidStockTransition('scrapped', 'in_stock')).toBe(false);
  });

  it('rejects scrapped → low (terminal state)', () => {
    expect(isValidStockTransition('scrapped', 'low')).toBe(false);
  });

  it('rejects installed → reserved', () => {
    expect(isValidStockTransition('installed', 'reserved')).toBe(false);
  });

  it('rejects reserved → low', () => {
    expect(isValidStockTransition('reserved', 'low')).toBe(false);
  });
});

describe('getValidStockTransitions', () => {
  it('returns no transitions for scrapped (terminal)', () => {
    expect(getValidStockTransitions('scrapped')).toEqual([]);
  });

  it('returns correct transitions for in_stock', () => {
    const transitions = getValidStockTransitions('in_stock');
    expect(transitions).toContain('low');
    expect(transitions).toContain('out');
    expect(transitions).toContain('reserved');
    expect(transitions).toContain('installed');
    expect(transitions).toContain('scrapped');
    expect(transitions).not.toContain('in_stock');
  });

  it('returns correct transitions for low', () => {
    const transitions = getValidStockTransitions('low');
    expect(transitions).toContain('in_stock');
    expect(transitions).toContain('out');
    expect(transitions).toContain('scrapped');
  });
});

// ─── Project Status Transitions ───────────────────────────────────────────────

describe('isValidProjectTransition', () => {
  it('allows idea → planned', () => {
    expect(isValidProjectTransition('idea', 'planned')).toBe(true);
  });

  it('allows planned → active', () => {
    expect(isValidProjectTransition('planned', 'active')).toBe(true);
  });

  it('allows active → deployed', () => {
    expect(isValidProjectTransition('active', 'deployed')).toBe(true);
  });

  it('allows deployed → retired', () => {
    expect(isValidProjectTransition('deployed', 'retired')).toBe(true);
  });

  it('allows no-op transition (same state)', () => {
    expect(isValidProjectTransition('active', 'active')).toBe(true);
  });

  it('rejects idea → deployed (skipping states)', () => {
    expect(isValidProjectTransition('idea', 'deployed')).toBe(false);
  });

  it('rejects idea → active', () => {
    expect(isValidProjectTransition('idea', 'active')).toBe(false);
  });
});

describe('getValidProjectTransitions', () => {
  it('returns correct transitions for idea', () => {
    const transitions = getValidProjectTransitions('idea');
    expect(transitions).toContain('planned');
    expect(transitions).toContain('retired');
    expect(transitions).not.toContain('active');
  });

  it('returns transitions for retired (can reactivate)', () => {
    expect(getValidProjectTransitions('retired')).toContain('active');
  });
});

// ─── Allocation Status Transitions ───────────────────────────────────────────

describe('isValidAllocationTransition', () => {
  it('allows reserved → in_use', () => {
    expect(isValidAllocationTransition('reserved', 'in_use')).toBe(true);
  });

  it('allows in_use → deployed', () => {
    expect(isValidAllocationTransition('in_use', 'deployed')).toBe(true);
  });

  it('allows deployed → recovered', () => {
    expect(isValidAllocationTransition('deployed', 'recovered')).toBe(true);
  });

  it('allows no-op transition (same state)', () => {
    expect(isValidAllocationTransition('reserved', 'reserved')).toBe(true);
  });

  it('rejects recovered → reserved (terminal state)', () => {
    expect(isValidAllocationTransition('recovered', 'reserved')).toBe(false);
  });

  it('rejects reserved → deployed (skipping in_use)', () => {
    expect(isValidAllocationTransition('reserved', 'deployed')).toBe(false);
  });
});

describe('getValidAllocationTransitions', () => {
  it('returns no transitions for recovered (terminal)', () => {
    expect(getValidAllocationTransitions('recovered')).toEqual([]);
  });

  it('returns correct transitions for reserved', () => {
    const transitions = getValidAllocationTransitions('reserved');
    expect(transitions).toContain('in_use');
    expect(transitions).toContain('recovered');
  });
});

// ─── Unified isValidTransition ────────────────────────────────────────────────

describe('isValidTransition', () => {
  it('validates stock transitions', () => {
    expect(isValidTransition('stock', 'in_stock', 'low')).toBe(true);
    expect(isValidTransition('stock', 'scrapped', 'in_stock')).toBe(false);
  });

  it('validates project transitions', () => {
    expect(isValidTransition('project', 'idea', 'planned')).toBe(true);
    expect(isValidTransition('project', 'idea', 'deployed')).toBe(false);
  });

  it('validates allocation transitions', () => {
    expect(isValidTransition('allocation', 'reserved', 'in_use')).toBe(true);
    expect(isValidTransition('allocation', 'recovered', 'reserved')).toBe(false);
  });

  it('returns false for unknown type', () => {
    expect(isValidTransition('unknown' as 'stock', 'a', 'b')).toBe(false);
  });
});

describe('getValidTransitions', () => {
  it('returns stock transitions', () => {
    expect(getValidTransitions('stock', 'scrapped')).toEqual([]);
    expect(getValidTransitions('stock', 'in_stock')).toContain('low');
  });

  it('returns project transitions', () => {
    expect(getValidTransitions('project', 'idea')).toContain('planned');
  });

  it('returns allocation transitions', () => {
    expect(getValidTransitions('allocation', 'recovered')).toEqual([]);
  });

  it('returns empty array for unknown type', () => {
    expect(getValidTransitions('unknown' as 'stock', 'in_stock')).toEqual([]);
  });
});

// ─── getTransitionError ───────────────────────────────────────────────────────

describe('getTransitionError', () => {
  it('includes from and to states in error message', () => {
    const msg = getTransitionError('stock', 'scrapped', 'in_stock');
    expect(msg).toContain('scrapped');
    expect(msg).toContain('in_stock');
  });

  it('lists terminal state as "none" when no valid transitions exist', () => {
    const msg = getTransitionError('stock', 'scrapped', 'low');
    expect(msg).toContain('none (terminal state)');
  });

  it('lists valid transitions in error message', () => {
    const msg = getTransitionError('stock', 'in_stock', 'recovered');
    expect(msg).toContain('low');
    expect(msg).toContain('reserved');
  });
});

// ─── validateTransition ───────────────────────────────────────────────────────

describe('validateTransition', () => {
  it('does not throw for valid transitions', () => {
    expect(() => validateTransition('stock', 'in_stock', 'low')).not.toThrow();
  });

  it('throws Error for invalid transitions', () => {
    expect(() => validateTransition('stock', 'scrapped', 'in_stock')).toThrow(Error);
  });

  it('throws with descriptive message for invalid transition', () => {
    expect(() => validateTransition('stock', 'scrapped', 'in_stock')).toThrow(
      /scrapped.*in_stock/
    );
  });
});

// ─── isTerminalState ─────────────────────────────────────────────────────────

describe('isTerminalState', () => {
  it('identifies scrapped as terminal for stock', () => {
    expect(isTerminalState('stock', 'scrapped')).toBe(true);
  });

  it('returns false for non-terminal stock states', () => {
    expect(isTerminalState('stock', 'in_stock')).toBe(false);
    expect(isTerminalState('stock', 'reserved')).toBe(false);
  });

  it('identifies recovered as terminal for allocation', () => {
    expect(isTerminalState('allocation', 'recovered')).toBe(true);
  });

  it('returns false for non-terminal allocation states', () => {
    expect(isTerminalState('allocation', 'reserved')).toBe(false);
  });

  it('returns false for unknown type', () => {
    expect(isTerminalState('unknown' as 'stock', 'in_stock')).toBe(false);
  });
});

// ─── deriveStatusFromQuantity ─────────────────────────────────────────────────

describe('deriveStatusFromQuantity', () => {
  it('transitions in_stock → out when quantity reaches 0', () => {
    expect(deriveStatusFromQuantity('in_stock', 0, 'exact')).toBe('out');
  });

  it('transitions low → out when quantity reaches 0', () => {
    expect(deriveStatusFromQuantity('low', 0, 'exact')).toBe('out');
  });

  it('transitions out → in_stock when quantity becomes positive', () => {
    expect(deriveStatusFromQuantity('out', 5, 'exact')).toBe('in_stock');
  });

  it('returns null when in_stock and quantity stays positive (no change)', () => {
    expect(deriveStatusFromQuantity('in_stock', 10, 'exact')).toBeNull();
  });

  it('returns null when already out and quantity is still 0 (no redundant transition)', () => {
    expect(deriveStatusFromQuantity('out', 0, 'exact')).toBeNull();
  });

  it('returns null for reserved status — auto-transition never touches reserved', () => {
    expect(deriveStatusFromQuantity('reserved', 0, 'exact')).toBeNull();
  });

  it('returns null for installed status', () => {
    expect(deriveStatusFromQuantity('installed', 0, 'exact')).toBeNull();
  });

  it('returns null for lost status', () => {
    expect(deriveStatusFromQuantity('lost', 0, 'exact')).toBeNull();
  });

  it('returns null for scrapped status (terminal state)', () => {
    expect(deriveStatusFromQuantity('scrapped', 0, 'exact')).toBeNull();
  });

  it('returns null for qualitative mode regardless of quantity', () => {
    expect(deriveStatusFromQuantity('in_stock', 0, 'qualitative')).toBeNull();
    expect(deriveStatusFromQuantity('out', 5, 'qualitative')).toBeNull();
  });

  it('returns null when newQty is null', () => {
    expect(deriveStatusFromQuantity('in_stock', null, 'exact')).toBeNull();
  });
});

