import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  daysBetween,
  rankVenturesByUrgency,
  scoreVenture,
  type VentureAttentionInput,
} from './scoring';

const baseInput: VentureAttentionInput = {
  ventureId: 'v1',
  ventureName: 'Acme',
  status: 'active',
  priorityWeight: 1,
  maxDaysWithoutAttention: 3,
  lastAttendedAt: '2026-07-07',
  attentionCount7d: 2,
  referenceDate: '2026-07-10',
};

describe('daysBetween', () => {
  it('counts whole days between dates', () => {
    assert.equal(daysBetween('2026-07-07', '2026-07-10'), 3);
    assert.equal(daysBetween('2026-07-10', '2026-07-10'), 0);
  });
});

describe('scoreVenture', () => {
  it('excludes paused ventures from eligibility', () => {
    const result = scoreVenture({ ...baseInput, status: 'paused' });
    assert.equal(result.isEligible, false);
    assert.equal(result.urgencyScore, 0);
    assert.equal(result.isOverdue, false);
  });

  it('marks never-attended ventures as overdue', () => {
    const result = scoreVenture({ ...baseInput, lastAttendedAt: null });
    assert.equal(result.daysSinceLastAttention, 4);
    assert.equal(result.isOverdue, true);
    assert.ok(result.urgencyScore > 0);
  });

  it('scores recently attended ventures lower than stale ones', () => {
    const recent = scoreVenture({
      ...baseInput,
      lastAttendedAt: '2026-07-09',
      attentionCount7d: 3,
    });
    const stale = scoreVenture({
      ...baseInput,
      lastAttendedAt: '2026-07-01',
      attentionCount7d: 0,
    });
    assert.ok(stale.urgencyScore > recent.urgencyScore);
    assert.equal(recent.isOverdue, false);
    assert.equal(stale.isOverdue, true);
  });

  it('applies priority weight to urgency', () => {
    const low = scoreVenture({
      ...baseInput,
      ventureId: 'low',
      priorityWeight: 1,
      lastAttendedAt: null,
      attentionCount7d: 0,
    });
    const high = scoreVenture({
      ...baseInput,
      ventureId: 'high',
      priorityWeight: 2,
      lastAttendedAt: null,
      attentionCount7d: 0,
    });
    assert.ok(high.urgencyScore > low.urgencyScore);
  });

  it('penalizes low attention count in the 7-day window', () => {
    const frequent = scoreVenture({ ...baseInput, attentionCount7d: 3 });
    const rare = scoreVenture({ ...baseInput, attentionCount7d: 0 });
    assert.ok(rare.urgencyScore > frequent.urgencyScore);
  });
});

describe('rankVenturesByUrgency', () => {
  it('ranks eligible ventures by urgency descending', () => {
    const ranked = rankVenturesByUrgency([
      scoreVenture({ ...baseInput, ventureId: 'a', ventureName: 'A', lastAttendedAt: '2026-07-09' }),
      scoreVenture({
        ...baseInput,
        ventureId: 'b',
        ventureName: 'B',
        lastAttendedAt: null,
        attentionCount7d: 0,
      }),
      scoreVenture({ ...baseInput, ventureId: 'c', ventureName: 'C', status: 'paused' }),
    ]);

    assert.equal(ranked[0].ventureId, 'b');
    assert.equal(ranked[1].ventureId, 'a');
    assert.equal(ranked[2].isEligible, false);
  });
});
