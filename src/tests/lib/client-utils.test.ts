import { cn, formatDate, truncate, wait, isEmpty, generateId } from '@/lib/client-utils';

describe('client utilities', () => {
  describe('cn function', () => {
    it('merges tailwind classes correctly', () => {
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
      expect(cn('p-4', { 'mt-2': true, 'mb-2': false })).toBe('p-4 mt-2');
      expect(cn('text-center', null, undefined, 'px-4')).toBe('text-center px-4');
    });

    it('handles class conflicts correctly', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
      expect(cn('p-4 m-2', 'p-6')).toBe('m-2 p-6');
    });
  });

  describe('formatDate function', () => {
    it('formats Date objects correctly', () => {
      const date = new Date('2023-05-15T12:00:00.000Z');
      expect(formatDate(date)).toBe('May 15, 2023');
    });

    it('formats date strings correctly', () => {
      const dateStr = '2023-05-15T12:00:00.000Z';
      expect(formatDate(dateStr)).toBe('May 15, 2023');
    });
  });

  describe('truncate function', () => {
    it('truncates strings longer than the specified length', () => {
      const longStr = 'This is a very long string that needs to be truncated';
      expect(truncate(longStr, 10)).toBe('This is a ...');
    });

    it('does not modify strings shorter than the specified length', () => {
      const shortStr = 'Short';
      expect(truncate(shortStr, 10)).toBe('Short');
    });

    it('handles strings exactly at the specified length', () => {
      const exactStr = 'Exactly 10';
      expect(truncate(exactStr, 10)).toBe('Exactly 10');
    });
  });

  describe('wait function', () => {
    it('waits for the specified duration', async () => {
      const start = Date.now();
      await wait(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow for small timing variations
    });
  });

  describe('isEmpty function', () => {
    it('identifies null as empty', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('identifies undefined as empty', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('identifies empty strings as empty', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('identifies whitespace-only strings as empty', () => {
      expect(isEmpty('   ')).toBe(true);
    });

    it('identifies empty arrays as empty', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('identifies empty objects as empty', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('identifies non-empty strings as not empty', () => {
      expect(isEmpty('hello')).toBe(false);
    });

    it('identifies non-empty arrays as not empty', () => {
      expect(isEmpty([1, 2, 3])).toBe(false);
    });

    it('identifies non-empty objects as not empty', () => {
      expect(isEmpty({ key: 'value' })).toBe(false);
    });

    it('identifies numbers as not empty', () => {
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(42)).toBe(false);
    });

    it('identifies booleans as not empty', () => {
      expect(isEmpty(false)).toBe(false);
      expect(isEmpty(true)).toBe(false);
    });
  });

  describe('generateId function', () => {
    it('generates an ID with the default length', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(8);
    });

    it('generates an ID with the specified length', () => {
      const id = generateId(10);
      expect(id.length).toBe(10);
    });

    it('generates unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });
}); 