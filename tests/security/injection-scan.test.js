import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const AGENT_DIR = path.resolve(import.meta.dirname, '../../.agent');

/**
 * Recursively collect all .md files from a directory
 * @param {string} dirPath
 * @returns {string[]}
 */
function collectMarkdownFiles(dirPath) {
  /** @type {string[]} */
  const results = [];
  
  if (!fs.existsSync(dirPath)) return results;
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Security Scan', () => {
  const mdFiles = collectMarkdownFiles(AGENT_DIR);

  describe('Prompt Injection Detection', () => {
    const injectionPatterns = [
      { pattern: /ignore\s+(all\s+)?previous\s+instructions/i, name: 'ignore previous instructions' },
      { pattern: /disregard\s+(all\s+)?rules/i, name: 'disregard rules' },
      { pattern: /you\s+are\s+now\s+a/i, name: 'identity override (you are now a)' },
      { pattern: /system:\s*override/i, name: 'system override' },
      { pattern: /forget\s+(everything|all)/i, name: 'forget all' },
    ];

    for (const { pattern, name } of injectionPatterns) {
      it(`should not contain '${name}' pattern in any agent file`, () => {
        for (const file of mdFiles) {
          const content = fs.readFileSync(file, 'utf-8');
          const relativePath = path.relative(AGENT_DIR, file);
          expect(
            pattern.test(content),
            `Potential prompt injection in ${relativePath}: '${name}'`
          ).toBe(false);
        }
      });
    }
  });

  describe('Hardcoded Secret Detection', () => {
    const secretPatterns = [
      { pattern: /sk-[a-zA-Z0-9]{20,}/, name: 'OpenAI API key' },
      { pattern: /AKIA[A-Z0-9]{16}/, name: 'AWS Access Key' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Personal Token' },
      { pattern: /gho_[a-zA-Z0-9]{36}/, name: 'GitHub OAuth Token' },
    ];

    for (const { pattern, name } of secretPatterns) {
      it(`should not contain ${name} pattern`, () => {
        for (const file of mdFiles) {
          const content = fs.readFileSync(file, 'utf-8');
          const relativePath = path.relative(AGENT_DIR, file);
          expect(
            pattern.test(content),
            `Potential ${name} in ${relativePath}`
          ).toBe(false);
        }
      });
    }
  });

  describe('BeSync Leakage Detection', () => {
    it('should not contain BeSync-specific governance references', () => {
      const besyncPatterns = [
        /BeSync\s+governance/i,
        /BeSync\s+Standard/i,
        /BeSync\s+architecture\s+alignment/i,
        /Apply\s+BeSync/i,
        /Maintain\s+BeSync/i,
      ];

      for (const file of mdFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(AGENT_DIR, file);
        
        for (const pattern of besyncPatterns) {
          expect(
            pattern.test(content),
            `BeSync leakage in ${relativePath}: ${pattern}`
          ).toBe(false);
        }
      }
    });
  });

  describe('Aspirational Reference Detection', () => {
    it('should not reference non-existent files like Meta-Directives', () => {
      const aspirationalPatterns = [
        /Meta-Directives/,
        /meta-directives\.md/,
      ];

      for (const file of mdFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(AGENT_DIR, file);
        
        for (const pattern of aspirationalPatterns) {
          expect(
            pattern.test(content),
            `Aspirational reference in ${relativePath}: ${pattern}`
          ).toBe(false);
        }
      }
    });
  });
});
