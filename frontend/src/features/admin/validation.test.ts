import { describe, expect, it } from 'vitest';
import {
  canonicalizeSource,
  hasFormErrors,
  snippetSourceError,
  snippetTitleError,
  validateSnippet,
} from './validation';

describe('canonicalizeSource', () => {
  it('normalizes line endings the way the backend does', () => {
    expect(canonicalizeSource('a\r\nb\rc\nd')).toBe('a\nb\nc\nd');
  });
});

describe('snippet validation', () => {
  it('requires a title within the backend limit', () => {
    expect(snippetTitleError('FizzBuzz')).toBeUndefined();
    expect(snippetTitleError('  ')).toBe('Title is required');
    expect(snippetTitleError('a'.repeat(200))).toBeUndefined();
    expect(snippetTitleError('a'.repeat(201))).toMatch(/200 characters/);
  });

  it('requires code within the backend limit', () => {
    expect(snippetSourceError('int a = 1;')).toBeUndefined();
    expect(snippetSourceError('   ')).toBe('Code is required');
    expect(snippetSourceError('a'.repeat(10_000))).toBeUndefined();
    expect(snippetSourceError('a'.repeat(10_001))).toMatch(/10000 characters/);
  });

  it('measures code length after line endings are normalized', () => {
    expect(snippetSourceError('a\r\n'.repeat(5_000))).toBeUndefined();
  });

  it('rejects code that is only whitespace', () => {
    expect(snippetSourceError('\r\n\r\n')).toBe('Code is required');
  });

  it('treats a complete snippet as error free', () => {
    const errors = validateSnippet({
      category: 'JAVA',
      difficulty: 'HARD',
      source: 'int a = 1;',
      title: 'FizzBuzz',
    });

    expect(hasFormErrors(errors)).toBe(false);
  });
});
