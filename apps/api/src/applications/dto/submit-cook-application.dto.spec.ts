import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmitCookApplicationDto } from './submit-cook-application.dto';

function validApplication(overrides: Record<string, unknown> = {}) {
  return plainToInstance(SubmitCookApplicationDto, {
    fullName: 'Test Cook',
    mobileNumber: '9876543210',
    email: 'cook@example.com',
    city: 'Bengaluru',
    pincode: '560001',
    foodPreference: 'both',
    foodReferences: '["Dosa","Chicken Curry"]',
    availableDays: '["monday","saturday"]',
    availabilityMode: 'shared',
    availabilityByDay: {
      monday: { from: '11:15', until: '14:20' },
      saturday: { from: '11:15', until: '14:20' },
    },
    ...overrides,
  });
}

describe('SubmitCookApplicationDto', () => {
  it('accepts a shared schedule for all selected days', async () => {
    const errors = await validate(validApplication());
    expect(errors).toHaveLength(0);
  });

  it('rejects per-day schedules for new applications', async () => {
    const errors = await validate(
      validApplication({
        availabilityMode: 'per_day',
        availabilityByDay: {
          monday: { from: '07:00', until: '11:00' },
          saturday: { from: '13:00', until: '17:00' },
        },
      }),
    );
    expect(errors.map(({ property }) => property)).toContain('availabilityMode');
  });

  it('rejects invalid Indian mobile numbers and pincodes', async () => {
    const errors = await validate(
      validApplication({
        mobileNumber: 'test9876543210',
        pincode: '12345',
      }),
    );
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['mobileNumber', 'pincode']),
    );
  });

  it('rejects duplicate food references regardless of case', async () => {
    const errors = await validate(
      validApplication({ foodReferences: '["Dosa","dosa"]' }),
    );
    expect(errors.map(({ property }) => property)).toContain('foodReferences');
  });

  it('rejects malformed times and invalid ranges', async () => {
    const errors = await validate(
      validApplication({
        availabilityByDay: {
          monday: { from: '09:60', until: '10:00' },
          saturday: { from: '18:01', until: '18:00' },
        },
      }),
    );
    expect(errors.map(({ property }) => property)).toContain('availabilityByDay');
  });

  it('rejects unsupported food preferences and unavailable days', async () => {
    const errors = await validate(
      validApplication({
        foodPreference: 'vegan',
        availableDays: '["monday","holiday"]',
        availabilityByDay: {
          monday: { from: '09:00', until: '17:30' },
          holiday: { from: '09:00', until: '17:30' },
        },
      }),
    );
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['foodPreference', 'availableDays']),
    );
  });

  it('requires matching schedules for all selected days in shared mode', async () => {
    const errors = await validate(
      validApplication({
        availabilityByDay: {
          monday: { from: '09:00', until: '17:30' },
          saturday: { from: '10:00', until: '18:00' },
        },
      }),
    );
    expect(errors.map(({ property }) => property)).toContain('availabilityByDay');
  });
});
