import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmitDeliveryPartnerApplicationDto } from './submit-delivery-partner-application.dto';

function validApplication(overrides: Record<string, unknown> = {}) {
  return plainToInstance(SubmitDeliveryPartnerApplicationDto, {
    fullName: 'Test Rider',
    mobileNumber: '9876543210',
    email: 'rider@example.com',
    city: 'Bengaluru',
    pincode: '560001',
    ownsVehicle: false,
    availableDaysMode: 'weekdays',
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workingHoursMode: 'full_app',
    availableFrom: '18:00',
    availableUntil: '21:00',
    ...overrides,
  });
}

describe('SubmitDeliveryPartnerApplicationDto', () => {
  it('rejects invalid Indian mobile numbers and pincodes', async () => {
    const errors = await validate(
      validApplication({
        mobileNumber: '98765432109876543210',
        pincode: '12345',
      }),
    );
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['mobileNumber', 'pincode']),
    );
  });

  it.each([
    [
      'all_days',
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    ],
    ['weekdays', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']],
    ['weekends', ['saturday', 'sunday']],
    ['choose_days', ['tuesday', 'sunday']],
  ])('accepts the %s working-days option', async (mode, days) => {
    const errors = await validate(
      validApplication({ availableDaysMode: mode, availableDays: days }),
    );
    expect(errors).toHaveLength(0);
  });

  it.each(['bike', 'car', 'auto'])(
    'requires a registration number for %s',
    async (vehicleType) => {
      const valid = await validate(
        validApplication({
          ownsVehicle: true,
          vehicleType,
          vehicleRegistrationNumber: 'KA01AB1234',
        }),
      );
      const missingRegistration = await validate(
        validApplication({ ownsVehicle: true, vehicleType }),
      );

      expect(valid).toHaveLength(0);
      expect(
        missingRegistration.some(
          ({ property }) => property === 'ownsVehicle',
        ),
      ).toBe(true);
      expect(
        missingRegistration.map(({ property }) => property),
      ).toContain('vehicleRegistrationNumber');
    },
  );

  it('requires an Other description without a registration number', async () => {
    const valid = await validate(
      validApplication({
        ownsVehicle: true,
        vehicleType: 'other',
        otherVehicleDescription: 'Electric scooter',
      }),
    );
    const missingDescription = await validate(
      validApplication({ ownsVehicle: true, vehicleType: 'other' }),
    );
    const withRegistration = await validate(
      validApplication({
        ownsVehicle: true,
        vehicleType: 'other',
        otherVehicleDescription: 'Electric scooter',
        vehicleRegistrationNumber: 'KA01AB1234',
      }),
    );

    expect(valid).toHaveLength(0);
    expect(missingDescription.map(({ property }) => property)).toContain(
      'otherVehicleDescription',
    );
    expect(withRegistration.map(({ property }) => property)).toContain(
      'ownsVehicle',
    );
  });

  it('requires a supported vehicle type for owners and no vehicle fields for non-owners', async () => {
    const missingType = await validate(validApplication({ ownsVehicle: true }));
    const unsupportedType = await validate(
      validApplication({
        ownsVehicle: true,
        vehicleType: 'scooter',
        vehicleRegistrationNumber: 'KA01AB1234',
      }),
    );
    const detailsWithoutOwnership = await validate(
      validApplication({
        ownsVehicle: false,
        vehicleType: 'bike',
        vehicleRegistrationNumber: 'KA01AB1234',
      }),
    );

    expect(missingType.map(({ property }) => property)).toContain('vehicleType');
    expect(unsupportedType.map(({ property }) => property)).toContain('vehicleType');
    expect(detailsWithoutOwnership.map(({ property }) => property)).toContain(
      'ownsVehicle',
    );
  });

  it('does not require work preference or can-arrange answers', async () => {
    const errors = await validate(validApplication());
    expect(errors).toHaveLength(0);
  });

  it('rejects days that do not match the selected preset', async () => {
    const errors = await validate(
      validApplication({
        availableDaysMode: 'weekends',
        availableDays: ['monday', 'sunday'],
      }),
    );
    expect(errors.map(({ property }) => property)).toContain('availableDays');
  });

  it('rejects preset days in an order that would violate the database constraint', async () => {
    const errors = await validate(
      validApplication({
        availableDaysMode: 'weekdays',
        availableDays: ['tuesday', 'monday', 'wednesday', 'thursday', 'friday'],
      }),
    );
    expect(errors.map(({ property }) => property)).toContain('availableDays');
  });

  it('accepts custom times in operating hours when the end is later', async () => {
    const errors = await validate(
      validApplication({
        workingHoursMode: 'custom',
        availableFrom: '18:30',
        availableUntil: '20:30',
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it.each([
    ['17:30', '20:00'],
    ['20:30', '20:00'],
    ['20:30', '21:30'],
    ['21:00', '21:00'],
  ])('rejects custom hours outside the allowed range or order (%s–%s)', async (from, until) => {
    const errors = await validate(
      validApplication({
        workingHoursMode: 'custom',
        availableFrom: from,
        availableUntil: until,
      }),
    );
    const invalidProperties = errors.map(({ property }) => property);
    expect(invalidProperties).toContain('availableUntil');
    if (from === '17:30') expect(invalidProperties).toContain('availableFrom');
  });

  it('requires exact app hours when Full App Hours is selected', async () => {
    const errors = await validate(
      validApplication({
        workingHoursMode: 'full_app',
        availableFrom: '18:30',
        availableUntil: '21:00',
      }),
    );
    expect(errors.map(({ property }) => property)).toContain('availableUntil');
  });
});
