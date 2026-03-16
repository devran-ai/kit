import { describe, it, expect } from 'vitest';
const path = require('path');
const { validateConfig, validateAllConfigs } = require('../../lib/config-validator');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

describe('Configuration Validator', () => {
  describe('validateConfig', () => {
    it('should validate manifest.json successfully', () => {
      const result = validateConfig(PROJECT_ROOT, 'manifest.json');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate workflow-state.json successfully', () => {
      const result = validateConfig(PROJECT_ROOT, 'workflow-state.json');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate loading-rules.json successfully', () => {
      const result = validateConfig(PROJECT_ROOT, 'loading-rules.json');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate reliability-config.json successfully', () => {
      const result = validateConfig(PROJECT_ROOT, 'reliability-config.json');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate hooks.json successfully', () => {
      const result = validateConfig(PROJECT_ROOT, 'hooks.json');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for unknown config names', () => {
      const result = validateConfig(PROJECT_ROOT, 'nonexistent.json');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('No schema defined');
    });
  });

  describe('validateAllConfigs', () => {
    it('should validate all known configs', () => {
      const report = validateAllConfigs(PROJECT_ROOT);
      expect(report.totalConfigs).toBeGreaterThanOrEqual(5);
      expect(report.validConfigs).toBe(report.totalConfigs);
    });
  });
});
