import { describe, it, expect } from 'vitest';

const {
  scoreConfidence,
  clusterPatterns,
  decayPatterns,
  getRecommendations,
  DECAY_INTERVAL,
} = require('../../lib/learning-engine');

describe('Learning Engine', () => {
  describe('scoreConfidence', () => {
    it('returns 0 for zero reinforcements', () => {
      expect(scoreConfidence(0)).toBe(0);
    });

    it('returns 0 for negative input', () => {
      expect(scoreConfidence(-5)).toBe(0);
    });

    it('returns 1 for single observation', () => {
      expect(scoreConfidence(1)).toBe(1);
    });

    it('returns 5 for 10+ reinforcements', () => {
      expect(scoreConfidence(10)).toBe(5);
      expect(scoreConfidence(100)).toBe(5);
    });

    it('scales through all tiers correctly', () => {
      expect(scoreConfidence(1)).toBe(1);
      expect(scoreConfidence(2)).toBe(2);
      expect(scoreConfidence(3)).toBe(2);
      expect(scoreConfidence(4)).toBe(3);
      expect(scoreConfidence(6)).toBe(4);
      expect(scoreConfidence(10)).toBe(5);
    });

    it('handles NaN and Infinity', () => {
      expect(scoreConfidence(NaN)).toBe(0);
      expect(scoreConfidence(Infinity)).toBe(0);
    });
  });

  describe('clusterPatterns', () => {
    const domainRules = [
      { domain: 'security', keywords: ['auth', 'security', 'jwt'] },
      { domain: 'testing', keywords: ['test', 'coverage', 'tdd'] },
    ];

    it('groups patterns by domain keywords', () => {
      const patterns = [
        { id: 'p1', keywords: ['auth', 'login'], reinforcements: 3 },
        { id: 'p2', keywords: ['test', 'unit'], reinforcements: 5 },
      ];
      const clusters = clusterPatterns(patterns, domainRules);
      expect(clusters.get('security')).toHaveLength(1);
      expect(clusters.get('testing')).toHaveLength(1);
    });

    it('puts unmatched patterns in uncategorized', () => {
      const patterns = [
        { id: 'p1', keywords: ['unrelated', 'stuff'], reinforcements: 1 },
      ];
      const clusters = clusterPatterns(patterns, domainRules);
      expect(clusters.get('uncategorized')).toHaveLength(1);
    });

    it('handles empty patterns array', () => {
      const clusters = clusterPatterns([], domainRules);
      expect(clusters.get('security')).toHaveLength(0);
      expect(clusters.get('testing')).toHaveLength(0);
    });
  });

  describe('decayPatterns', () => {
    it('reduces confidence by 1 per decay interval', () => {
      const patterns = [
        { id: 'p1', confidence: 5, sessionsSinceReinforcement: DECAY_INTERVAL },
      ];
      const result = decayPatterns(patterns);
      expect(result[0].confidence).toBe(4);
      expect(result[0].archived).toBe(false);
    });

    it('archives patterns at confidence 0', () => {
      const patterns = [
        { id: 'p1', confidence: 1, sessionsSinceReinforcement: DECAY_INTERVAL * 2 },
      ];
      const result = decayPatterns(patterns);
      expect(result[0].confidence).toBe(0);
      expect(result[0].archived).toBe(true);
    });

    it('does not decay recently reinforced patterns', () => {
      const patterns = [
        { id: 'p1', confidence: 3, sessionsSinceReinforcement: 5 },
      ];
      const result = decayPatterns(patterns);
      expect(result[0].confidence).toBe(3);
      expect(result[0].archived).toBe(false);
    });

    it('does not produce negative confidence', () => {
      const patterns = [
        { id: 'p1', confidence: 1, sessionsSinceReinforcement: 100 },
      ];
      const result = decayPatterns(patterns);
      expect(result[0].confidence).toBe(0);
    });
  });

  describe('getRecommendations', () => {
    it('suggests skill promotion for 3+ high-confidence patterns', () => {
      const clusters = new Map();
      clusters.set('security', [
        { reinforcements: 10 },
        { reinforcements: 8 },
        { reinforcements: 7 },
      ]);
      const recs = getRecommendations(clusters);
      expect(recs).toHaveLength(1);
      expect(recs[0].action).toBe('promote-to-skill');
      expect(recs[0].domain).toBe('security');
    });

    it('suggests rule promotion for 1-2 high-confidence patterns', () => {
      const clusters = new Map();
      clusters.set('testing', [
        { reinforcements: 10 },
      ]);
      const recs = getRecommendations(clusters);
      expect(recs).toHaveLength(1);
      expect(recs[0].action).toBe('promote-to-rule');
    });

    it('skips uncategorized domain', () => {
      const clusters = new Map();
      clusters.set('uncategorized', [
        { reinforcements: 10 },
        { reinforcements: 10 },
        { reinforcements: 10 },
      ]);
      const recs = getRecommendations(clusters);
      expect(recs).toHaveLength(0);
    });
  });
});
