import { describe, expect, it } from 'vitest';
import {
  categoryDescriptionError,
  categoryNameError,
  hasFormErrors,
  validateCategory,
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
