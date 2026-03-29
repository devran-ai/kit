/**
 * Devran AI Kit — Decision Entry Validator
 *
 * Validates decision entries before writing to decisions.json.
 * Extracted from onboarding-engine.js for single-responsibility compliance.
 *
 * @module lib/decision-validator
 * @since v5.1.0
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Required fields for a decision entry in decisions.json.
 * @type {ReadonlyArray<string>}
 */
const REQUIRED_DECISION_FIELDS = Object.freeze([
  'id', 'title', 'domain', 'date', 'status',
]);

/**
 * Valid decision status values.
 * @type {ReadonlyArray<string>}
 */
const VALID_DECISION_STATUSES = Object.freeze([
  'proposed', 'accepted', 'superseded', 'stale',
]);

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a decision entry against the schema before writing to decisions.json.
 *
 * @param {object} entry - Decision entry to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDecisionEntry(entry) {
  const errors = [];

  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Decision entry must be a non-null object'] };
  }

  for (const field of REQUIRED_DECISION_FIELDS) {
    if (!entry[field] || typeof entry[field] !== 'string' || !entry[field].trim()) {
      errors.push(`Missing or empty required field: "${field}"`);
    }
  }

  if (entry.status && !VALID_DECISION_STATUSES.includes(entry.status)) {
    errors.push(`Invalid decision status: "${entry.status}". Valid: ${VALID_DECISION_STATUSES.join(', ')}`);
  }

  if (entry.keywords && !Array.isArray(entry.keywords)) {
    errors.push('"keywords" must be an array');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
  REQUIRED_DECISION_FIELDS,
  VALID_DECISION_STATUSES,
  validateDecisionEntry,
});
