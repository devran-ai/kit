/**
 * Devran AI Kit — Quality Score Calculator
 *
 * Calculates a quality score (0-100) for generated document sets.
 * Extracted from doc-generator.js for single-responsibility compliance.
 *
 * Four dimensions (25 points each):
 *   - Completeness: templates generated vs applicable, unresolved tokens, empty sections
 *   - Consistency: project name coherence, cross-reference validity
 *   - Depth: average length, Mermaid diagrams, prose content
 *   - Actionability: next steps, success criteria, estimations
 *
 * @module lib/quality-score
 * @since v5.1.0
 */

'use strict';

// ─── Quality Score ────────────────────────────────────────────────────────────

/**
 * Calculates a quality score (0-100) for the generated document set.
 *
 * @param {Array<{ fileName: string, content: string }>} documents - Generated documents
 * @param {string[]} expectedQueue - Expected template queue
 * @param {object} validationResult - Result from validateDocumentSet
 * @returns {{ total: number, completeness: number, consistency: number, depth: number, actionability: number, details: object }}
 */
function calculateQualityScore(documents, expectedQueue, validationResult) {
  // ── Completeness (0-25) ──
  const generatedCount = documents.length;
  const expectedCount = expectedQueue.length;
  let completeness = expectedCount > 0
    ? Math.round((generatedCount / expectedCount) * 25)
    : 25;

  // Deduct for unresolved tokens
  const unresolvedCount = validationResult.issues.filter((i) => i.check === 1).length;
  completeness = Math.max(0, completeness - (unresolvedCount * 2));

  // Deduct for empty sections
  const emptySections = validationResult.issues.filter((i) => i.check === 2).length;
  completeness = Math.max(0, completeness - emptySections);

  // ── Consistency (0-25) ──
  let consistency = 25;
  const nameIssues = validationResult.issues.filter((i) => i.check === 4).length;
  consistency = Math.max(0, consistency - (nameIssues * 5));

  const crossRefIssues = validationResult.issues.filter((i) => i.check === 3).length;
  consistency = Math.max(0, consistency - (crossRefIssues * 3));

  // ── Depth (0-25) ──
  let depth = 0;
  if (documents.length > 0) {
    const avgLength = documents.reduce((sum, d) => sum + d.content.length, 0) / documents.length;
    // Minimum threshold: 500 chars per document
    depth = Math.min(15, Math.round((avgLength / 2000) * 15));

    // Bonus for Mermaid diagrams
    const hasMermaid = documents.some((d) => d.content.includes('```mermaid'));
    if (hasMermaid) depth += 5;

    // Bonus for non-bullet-only content
    const hasProseContent = documents.some((d) => {
      const lines = d.content.split('\n').filter((l) => l.trim());
      const bulletLines = lines.filter((l) => l.trim().startsWith('-') || l.trim().startsWith('*'));
      return bulletLines.length < lines.length * 0.7;
    });
    if (hasProseContent) depth += 5;

    depth = Math.min(25, depth);
  }

  // ── Actionability (0-25) ──
  let actionability = 0;
  for (const doc of documents) {
    const lower = doc.content.toLowerCase();
    if (lower.includes('next step') || lower.includes('action item')) actionability += 2;
    if (lower.includes('success criteria') || lower.includes('acceptance criteria')) actionability += 3;
    if (lower.includes('estimation') || lower.includes('story point') || lower.includes('sprint')) actionability += 2;
  }
  actionability = Math.min(25, actionability);

  const total = completeness + consistency + depth + actionability;

  return {
    total: Math.min(100, total),
    completeness,
    consistency,
    depth,
    actionability,
    details: {
      generatedCount,
      expectedCount,
      unresolvedTokens: unresolvedCount,
      emptySections,
      crossRefIssues,
      nameIssues,
    },
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
  calculateQualityScore,
});
