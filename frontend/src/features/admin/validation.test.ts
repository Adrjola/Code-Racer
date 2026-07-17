import { describe, expect, it } from 'vitest';
import {
  canonicalizeSource,
  categoryDescriptionError,
  categoryNameError,
  hasFormErrors,
  snippetSourceError,
  snippetTitleError,
  validateCategory,
  validateSnippet,
} from './validation';

describe('category validation', () => {
  it('requires a name that is not only whitespace', () => {
    expect(categoryNameError('Java')).toBeUndefined();
    expect(categoryNameError('')).toBe('Name is required');
    expect(categoryNameError('   ')).toBe('Name is required');
  });

  it('rejects a name longer than the backend allows', () => {
    expect(categoryNameError('a'.repeat(100))).toBeUndefined();
    expect(categoryNameError('a'.repeat(101))).toMatch(/100 characters/);
  });

  it('allows an empty description but caps its length', () => {
    expect(categoryDescriptionError('')).toBeUndefined();
    expect(categoryDescriptionError('a'.repeat(500))).toBeUndefined();
    expect(categoryDescriptionError('a'.repeat(501))).toMatch(/500 characters/);
  });

  it('reports every field at once', () => {
    const errors = validateCategory({
      description: 'a'.repeat(501),
      name: '',
    });

    expect(errors).toEqual({
      description: expect.stringMatching(/500 characters/),
      name: 'Name is required',
    });
    expect(hasFormErrors(errors)).toBe(true);
  });

  it('treats a valid category as error free', () => {
    const errors = validateCategory({ description: '', name: 'Java' });

    expect(hasFormErrors(errors)).toBe(false);
  });
});

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

  it('requires a category', () => {
    const errors = validateSnippet({
      categoryId: '',
      difficulty: 'EASY',
      source: 'int a = 1;',
      title: 'FizzBuzz',
    });

    expect(errors.categoryId).toBe('Category is required');
    expect(hasFormErrors(errors)).toBe(true);
  });

  it('treats a complete snippet as error free', () => {
    const errors = validateSnippet({
      categoryId: 'c1',
      difficulty: 'HARD',
      source: 'int a = 1;',
      title: 'FizzBuzz',
    });

    expect(hasFormErrors(errors)).toBe(false);
  });
});
