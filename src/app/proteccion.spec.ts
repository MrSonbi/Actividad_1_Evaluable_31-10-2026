import { describe, expect, it } from 'vitest';

describe('prueba de protección de ramas', () => {
  it('falla a propósito', () => {
    expect(1).toBe(2);
  });
});
