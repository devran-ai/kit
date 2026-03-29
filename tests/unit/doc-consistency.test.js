import { describe, it, expect } from 'vitest';

const {
  validateDocument,
  validateDocumentSet,
  SEVERITY,
} = require('../../lib/doc-generator');

describe('Document Consistency — Unresolved Tokens (Check 1)', () => {
  it('should detect single unresolved token', () => {
    const result = validateDocument('# App\n\nStack: {{techStack}}', 'test.md', 'App', new Set());
    const tokenIssues = result.issues.filter((i) => i.check === 1);
    expect(tokenIssues).toHaveLength(1);
    expect(tokenIssues[0].severity).toBe(SEVERITY.ERROR);
    expect(tokenIssues[0].message).toContain('{{techStack}}');
  });

  it('should detect multiple unresolved tokens', () => {
    const content = '# App\n\n{{a}} and {{b}} and {{c}}';
    const result = validateDocument(content, 'test.md', 'App', new Set());
    const msg = result.issues.find((i) => i.check === 1).message;
    expect(msg).toContain('{{a}}');
    expect(msg).toContain('{{b}}');
    expect(msg).toContain('{{c}}');
  });

  it('should deduplicate repeated tokens', () => {
    const content = '# App\n\n{{x}} then {{x}} again';
    const result = validateDocument(content, 'test.md', 'App', new Set());
    const msg = result.issues.find((i) => i.check === 1).message;
    // Should list {{x}} only once
    expect(msg.match(/\{\{x\}\}/g)).toHaveLength(1);
  });

  it('should pass when no unresolved tokens', () => {
    const result = validateDocument('# App\n\nAll resolved.', 'test.md', 'App', new Set());
    expect(result.issues.filter((i) => i.check === 1)).toHaveLength(0);
  });
});

describe('Document Consistency — Empty Sections (Check 2)', () => {
  it('should detect empty section followed by another header', () => {
    const content = '# App\n\n## Empty\n\n## Has Content\n\nSome text.';
    const result = validateDocument(content, 'test.md', 'App', new Set());
    const empty = result.issues.filter((i) => i.check === 2);
    expect(empty.length).toBeGreaterThan(0);
    expect(empty[0].severity).toBe(SEVERITY.WARNING);
    expect(empty[0].message).toContain('Empty');
  });

  it('should detect empty section at end of file', () => {
    const content = '# App\n\n## Content\n\nText here.\n\n## Trailing Empty\n';
    const result = validateDocument(content, 'test.md', 'App', new Set());
    const empty = result.issues.filter((i) => i.check === 2);
    expect(empty.some((e) => e.message.includes('Trailing Empty'))).toBe(true);
  });

  it('should not flag section with content', () => {
    const content = '# App\n\nIntro paragraph.\n\n## Filled\n\nThis section has content.\n\n## Also Filled\n\nMore content.';
    const result = validateDocument(content, 'test.md', 'App', new Set());
    expect(result.issues.filter((i) => i.check === 2)).toHaveLength(0);
  });
});

describe('Document Consistency — Broken Cross-References (Check 3)', () => {
  it('should detect reference to non-generated file', () => {
    const content = '# App\n\nSee MISSING.md for details.';
    const generated = new Set(['ARCHITECTURE.md']);
    const result = validateDocument(content, 'test.md', 'App', generated);
    const broken = result.issues.filter((i) => i.check === 3);
    expect(broken).toHaveLength(1);
    expect(broken[0].message).toContain('MISSING.md');
  });

  it('should accept reference to generated file', () => {
    const content = '# App\n\nSee ARCHITECTURE.md for details.';
    const generated = new Set(['ARCHITECTURE.md']);
    const result = validateDocument(content, 'test.md', 'App', generated);
    expect(result.issues.filter((i) => i.check === 3)).toHaveLength(0);
  });

  it('should detect multiple broken references', () => {
    const content = '# App\n\nRefer to A.md and see B.md for info.';
    const generated = new Set(['C.md']);
    const result = validateDocument(content, 'test.md', 'App', generated);
    expect(result.issues.filter((i) => i.check === 3)).toHaveLength(2);
  });

  it('should recognize various reference patterns', () => {
    const patterns = [
      'See FILE.md', 'see FILE.md', 'Refer to FILE.md',
      'refer to FILE.md', 'defined in FILE.md', 'Details in FILE.md',
    ];
    const generated = new Set(['OTHER.md']);
    for (const pat of patterns) {
      const result = validateDocument(`# App\n\n${pat}`, 'test.md', 'App', generated);
      expect(result.issues.filter((i) => i.check === 3).length).toBeGreaterThan(0);
    }
  });

  it('should skip cross-ref check when generatedFiles is empty', () => {
    const content = '# App\n\nSee ANYTHING.md for details.';
    const result = validateDocument(content, 'test.md', 'App', new Set());
    expect(result.issues.filter((i) => i.check === 3)).toHaveLength(0);
  });
});

describe('Document Consistency — Project Name (Check 4)', () => {
  it('should detect title without project name', () => {
    const result = validateDocument('# Wrong Title\n\nContent.', 'test.md', 'MyApp', new Set());
    const nameIssues = result.issues.filter((i) => i.check === 4);
    expect(nameIssues).toHaveLength(1);
    expect(nameIssues[0].message).toContain('MyApp');
  });

  it('should accept title containing project name', () => {
    const result = validateDocument('# MyApp — Architecture\n\nContent.', 'test.md', 'MyApp', new Set());
    expect(result.issues.filter((i) => i.check === 4)).toHaveLength(0);
  });

  it('should be case-insensitive', () => {
    const result = validateDocument('# myapp — Docs\n\nContent.', 'test.md', 'MyApp', new Set());
    expect(result.issues.filter((i) => i.check === 4)).toHaveLength(0);
  });

  it('should skip check when no projectName provided', () => {
    const result = validateDocument('# Anything\n\nContent.', 'test.md', '', new Set());
    expect(result.issues.filter((i) => i.check === 4)).toHaveLength(0);
  });
});

describe('Document Consistency — Set Validation', () => {
  it('should validate cross-references across document set', () => {
    const docs = [
      { fileName: 'A.md', content: '# App — A\n\nSee B.md for details.' },
      { fileName: 'B.md', content: '# App — B\n\nSee C.md for details.' },
    ];
    const result = validateDocumentSet(docs, 'App');
    // B.md references C.md which is not in the set
    const broken = result.issues.filter((i) => i.check === 3);
    expect(broken).toHaveLength(1);
    expect(broken[0].message).toContain('C.md');
  });

  it('should pass when all cross-references are within set', () => {
    const docs = [
      { fileName: 'A.md', content: '# App — A\n\nSee B.md for details.' },
      { fileName: 'B.md', content: '# App — B\n\nContent.' },
    ];
    const result = validateDocumentSet(docs, 'App');
    expect(result.issues.filter((i) => i.check === 3)).toHaveLength(0);
  });
});
