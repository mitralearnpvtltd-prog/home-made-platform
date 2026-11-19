import {
  deriveAccountPassword,
  normalizeIndianPhone,
  toE164India,
} from './auth.utils';

describe('auth.utils', () => {
  describe('normalizeIndianPhone', () => {
    it('keeps a 10-digit mobile number', () => {
      expect(normalizeIndianPhone('9876543210')).toBe('9876543210');
    });

    it('strips +91 / 91 / leading 0 prefixes', () => {
      expect(normalizeIndianPhone('+91 98765 43210')).toBe('9876543210');
      expect(normalizeIndianPhone('919876543210')).toBe('9876543210');
      expect(normalizeIndianPhone('09876543210')).toBe('9876543210');
    });
  });

  describe('toE164India', () => {
    it('formats as +91XXXXXXXXXX', () => {
      expect(toE164India('9876543210')).toBe('+919876543210');
      expect(toE164India('+91 9876543210')).toBe('+919876543210');
    });
  });

  describe('deriveAccountPassword', () => {
    it('is deterministic for the same inputs', () => {
      const a = deriveAccountPassword({
        phone10: '9876543210',
        email: 'A@Example.com',
        secret: 'test-secret',
      });
      const b = deriveAccountPassword({
        phone10: '+919876543210',
        email: 'a@example.com',
        secret: 'test-secret',
      });
      expect(a).toBe(b);
      expect(a.startsWith('Aa1!')).toBe(true);
    });

    it('changes when phone, email, or secret changes', () => {
      const base = deriveAccountPassword({
        phone10: '9876543210',
        email: 'a@example.com',
        secret: 'test-secret',
      });
      expect(
        deriveAccountPassword({
          phone10: '9876543211',
          email: 'a@example.com',
          secret: 'test-secret',
        }),
      ).not.toBe(base);
      expect(
        deriveAccountPassword({
          phone10: '9876543210',
          email: 'b@example.com',
          secret: 'test-secret',
        }),
      ).not.toBe(base);
      expect(
        deriveAccountPassword({
          phone10: '9876543210',
          email: 'a@example.com',
          secret: 'other-secret',
        }),
      ).not.toBe(base);
    });
  });
});
