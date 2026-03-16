/**
 * Antigravity AI Kit — Configuration Validator
 *
 * Runtime JSON schema validation for engine configuration files.
 * Catches configuration corruption and drift before they cause
 * runtime failures.
 *
 * @module lib/config-validator
 * @author Emre Dursun
 * @since v3.2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { AGENT_DIR, ENGINE_DIR, HOOKS_DIR } = require('./constants');

/**
 * @typedef {object} ValidationResult
 * @property {boolean} valid - Whether the config is valid
 * @property {string[]} errors - Validation error messages
 * @property {string[]} warnings - Non-critical warnings
 */

/**
 * Schema definitions for engine configuration files.
 * Each schema defines required fields, their types, and constraints.
 */
const SCHEMAS = {
  'manifest.json': {
    required: ['schemaVersion', 'kitVersion', 'capabilities'],
    types: {
      schemaVersion: 'string',
      kitVersion: 'string',
      capabilities: 'object',
    },
    nested: {
      capabilities: {
        required: ['agents', 'commands', 'skills', 'workflows'],
        types: {
          agents: 'object',
          commands: 'object',
          skills: 'object',
          workflows: 'object',
        },
      },
    },
  },

  'workflow-state.json': {
    required: ['currentPhase', 'phases', 'transitions'],
    types: {
      currentPhase: 'string',
      phases: 'object',
      transitions: 'array',
    },
    validators: {
      currentPhase: (value) => {
        const validPhases = ['IDLE', 'EXPLORE', 'PLAN', 'IMPLEMENT', 'VERIFY', 'REVIEW', 'DEPLOY', 'MAINTAIN'];
        return validPhases.includes(value) ? null : `Invalid phase: ${value}. Valid: ${validPhases.join(', ')}`;
      },
    },
  },

  'loading-rules.json': {
    required: ['domainRules', 'contextBudget'],
    types: {
      domainRules: 'array',
      contextBudget: 'object',
    },
    nested: {
      contextBudget: {
        required: ['maxAgentsPerSession', 'maxSkillsPerSession'],
        types: {
          maxAgentsPerSession: 'number',
          maxSkillsPerSession: 'number',
        },
      },
    },
  },

  'reliability-config.json': {
    required: ['errorBudget'],
    types: {
      errorBudget: 'object',
    },
    nested: {
      errorBudget: {
        required: ['thresholds', 'resetCadence'],
        types: {
          thresholds: 'object',
          resetCadence: 'string',
        },
      },
    },
  },

  'hooks.json': {
    required: ['hooks'],
    types: {
      hooks: 'array',
    },
    arrayItemSchema: {
      hooks: {
        required: ['event'],
        types: {
          event: 'string',
        },
      },
    },
  },
};

/**
 * Validates a value's type.
 *
 * @param {*} value - Value to check
 * @param {string} expectedType - Expected type string
 * @returns {boolean}
 */
function checkType(value, expectedType) {
  if (expectedType === 'array') {
    return Array.isArray(value);
  }
  return typeof value === expectedType;
}

/**
 * Validates a configuration object against its schema.
 *
 * @param {object} config - Parsed configuration object
 * @param {object} schema - Schema definition
 * @param {string} [prefix=''] - Field path prefix for nested errors
 * @returns {ValidationResult}
 */
function validateAgainstSchema(config, schema, prefix = '') {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of (schema.required || [])) {
    const fieldPath = prefix ? `${prefix}.${field}` : field;
    if (config[field] === undefined || config[field] === null) {
      errors.push(`Missing required field: ${fieldPath}`);
    }
  }

  // Check types
  for (const [field, expectedType] of Object.entries(schema.types || {})) {
    const fieldPath = prefix ? `${prefix}.${field}` : field;
    if (config[field] !== undefined && config[field] !== null) {
      if (!checkType(config[field], expectedType)) {
        errors.push(`Invalid type for ${fieldPath}: expected ${expectedType}, got ${Array.isArray(config[field]) ? 'array' : typeof config[field]}`);
      }
    }
  }

  // Run custom validators
  for (const [field, validator] of Object.entries(schema.validators || {})) {
    if (config[field] !== undefined) {
      const error = validator(config[field]);
      if (error) {
        errors.push(error);
      }
    }
  }

  // Validate nested schemas
  for (const [field, nestedSchema] of Object.entries(schema.nested || {})) {
    if (config[field] && typeof config[field] === 'object' && !Array.isArray(config[field])) {
      const nestedResult = validateAgainstSchema(config[field], nestedSchema, prefix ? `${prefix}.${field}` : field);
      errors.push(...nestedResult.errors);
      warnings.push(...nestedResult.warnings);
    }
  }

  // Validate array items
  for (const [field, itemSchema] of Object.entries(schema.arrayItemSchema || {})) {
    if (Array.isArray(config[field])) {
      config[field].forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const itemResult = validateAgainstSchema(item, itemSchema, `${field}[${index}]`);
          errors.push(...itemResult.errors);
          warnings.push(...itemResult.warnings);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates a specific engine configuration file.
 *
 * @param {string} projectRoot - Root directory of the project
 * @param {string} configName - Configuration file name (e.g., 'manifest.json')
 * @returns {ValidationResult}
 */
function validateConfig(projectRoot, configName) {
  const schema = SCHEMAS[configName];
  if (!schema) {
    return { valid: false, errors: [`No schema defined for: ${configName}`], warnings: [] };
  }

  const configDir = configName === 'manifest.json'
    ? path.join(projectRoot, AGENT_DIR)
    : configName === 'hooks.json'
      ? path.join(projectRoot, AGENT_DIR, HOOKS_DIR)
      : path.join(projectRoot, AGENT_DIR, ENGINE_DIR);

  const configPath = path.join(configDir, configName);

  if (!fs.existsSync(configPath)) {
    return { valid: false, errors: [`Config file not found: ${configPath}`], warnings: [] };
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (parseError) {
    return { valid: false, errors: [`Invalid JSON: ${parseError.message}`], warnings: [] };
  }

  return validateAgainstSchema(config, schema);
}

/**
 * Validates all known engine configuration files.
 *
 * @param {string} projectRoot - Root directory of the project
 * @returns {{ totalConfigs: number, validConfigs: number, results: Object.<string, ValidationResult> }}
 */
function validateAllConfigs(projectRoot) {
  const results = {};
  let validCount = 0;

  for (const configName of Object.keys(SCHEMAS)) {
    results[configName] = validateConfig(projectRoot, configName);
    if (results[configName].valid) {
      validCount += 1;
    }
  }

  return {
    totalConfigs: Object.keys(SCHEMAS).length,
    validConfigs: validCount,
    results,
  };
}

module.exports = {
  validateConfig,
  validateAllConfigs,
  SCHEMAS,
};
