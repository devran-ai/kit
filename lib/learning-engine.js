/**
 * Devran AI Kit — Learning Engine
 *
 * Confidence scoring, pattern clustering, and decay model
 * for the continuous learning system. Inspired by Netflix's
 * chaos engineering feedback loop: observe, score, cluster, promote, decay.
 *
 * All functions are pure — no I/O, no side effects.
 *
 * @module lib/learning-engine
 * @since v4.1.0
 */

'use strict';

/** Confidence tier boundaries */
const TIERS = Object.freeze([
  { min: 10, score: 5 },
  { min: 6, score: 4 },
  { min: 4, score: 3 },
  { min: 2, score: 2 },
  { min: 1, score: 1 },
]);

/** Sessions without reinforcement before 1 point of decay */
const DECAY_INTERVAL = 10;

/** Minimum high-confidence patterns for skill promotion */
const SKILL_PROMOTION_THRESHOLD = 3;

/** Minimum confidence score for promotion eligibility */
const PROMOTION_CONFIDENCE = 4;

/**
 * Score confidence for a pattern based on reinforcement count.
 * Scale: 0 (never seen) to 5 (battle-tested, 10+ reinforcements).
 *
 * @param {number} reinforcementCount - Times pattern was observed
 * @returns {number} Confidence score 0-5
 */
function scoreConfidence(reinforcementCount) {
  if (!Number.isFinite(reinforcementCount) || reinforcementCount <= 0) {
    return 0;
  }
  for (const tier of TIERS) {
    if (reinforcementCount >= tier.min) {
      return tier.score;
    }
  }
  return 0;
}

/**
 * Cluster patterns by domain using loading-rules keyword overlap.
 *
 * @param {Array<{id: string, keywords: string[], reinforcements: number}>} patterns
 * @param {Array<{domain: string, keywords: string[]}>} domainRules
 * @returns {Map<string, Array>} Patterns grouped by domain
 */
function clusterPatterns(patterns, domainRules) {
  if (!Array.isArray(patterns)) return new Map();
  if (!Array.isArray(domainRules)) return new Map();

  const clusters = new Map();

  for (const rule of domainRules) {
    clusters.set(rule.domain, []);
  }
  clusters.set('uncategorized', []);

  for (const pattern of patterns) {
    let matched = false;
    for (const rule of domainRules) {
      const hasOverlap = pattern.keywords.some(pk =>
        rule.keywords.some(rk =>
          rk.toLowerCase().includes(pk.toLowerCase()) ||
          pk.toLowerCase().includes(rk.toLowerCase())
        )
      );
      if (hasOverlap) {
        clusters.get(rule.domain).push(pattern);
        matched = true;
        break;
      }
    }
    if (!matched) {
      clusters.get('uncategorized').push(pattern);
    }
  }

  return clusters;
}

/**
 * Apply decay to patterns based on sessions since last reinforcement.
 * Loses 1 confidence point per DECAY_INTERVAL unreinforced sessions.
 * Score 0 marks the pattern as archived.
 *
 * @param {Array<{id: string, confidence: number, sessionsSinceReinforcement: number}>} patterns
 * @returns {Array<{id: string, confidence: number, archived: boolean}>}
 */
function decayPatterns(patterns) {
  if (!Array.isArray(patterns)) return [];

  return patterns.map(p => {
    const sessions = Number.isFinite(p.sessionsSinceReinforcement) ? p.sessionsSinceReinforcement : 0;
    const confidence = Number.isFinite(p.confidence) ? p.confidence : 0;
    const decayAmount = Math.floor(sessions / DECAY_INTERVAL);
    const newConfidence = Math.max(0, confidence - decayAmount);
    return {
      ...p,
      confidence: newConfidence,
      archived: newConfidence === 0,
    };
  });
}

/**
 * Generate recommendations for pattern promotion.
 * Clusters with 3+ high-confidence patterns suggest skill creation.
 * Clusters with 1-2 high-confidence patterns suggest rule creation.
 *
 * @param {Map<string, Array<{reinforcements: number}>>} clusters
 * @returns {Array<{domain: string, action: string, reason: string, patterns: Array}>}
 */
function getRecommendations(clusters) {
  const recommendations = [];

  for (const [domain, patterns] of clusters) {
    if (domain === 'uncategorized') continue;

    const highConfidence = patterns.filter(p =>
      scoreConfidence(p.reinforcements) >= PROMOTION_CONFIDENCE
    );

    if (highConfidence.length >= SKILL_PROMOTION_THRESHOLD) {
      recommendations.push({
        domain,
        action: 'promote-to-skill',
        reason: `${highConfidence.length} battle-tested patterns in ${domain}`,
        patterns: highConfidence,
      });
    } else if (highConfidence.length >= 1) {
      recommendations.push({
        domain,
        action: 'promote-to-rule',
        reason: `${highConfidence.length} high-confidence pattern(s) in ${domain}`,
        patterns: highConfidence,
      });
    }
  }

  return recommendations;
}

module.exports = Object.freeze({
  scoreConfidence,
  clusterPatterns,
  decayPatterns,
  getRecommendations,
  DECAY_INTERVAL,
  SKILL_PROMOTION_THRESHOLD,
  PROMOTION_CONFIDENCE,
});
