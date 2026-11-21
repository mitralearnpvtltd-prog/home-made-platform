import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  it('saves all food and availability fields without photo or terms data', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        application_id: 'CK-20261120-ABC123',
        status: 'pending',
        created_at: '2026-11-20T00:00:00.000Z',
      },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const client = {
      from: jest.fn().mockReturnValue({ insert }),
    } as unknown as SupabaseClient;

    const service = new ApplicationsService(client);
    await service.submitCookApplication({
      fullName: 'Test Cook',
      mobileNumber: '9876543210',
      email: 'cook@example.com',
      city: 'Bengaluru',
      pincode: '560001',
      foodPreference: 'both',
      foodReferences: ['Dosa', 'Chicken Curry'],
      availableDays: ['monday', 'saturday'],
      availabilityMode: 'shared',
      availabilityByDay: {
        monday: { from: '11:15', until: '14:20' },
        saturday: { from: '11:15', until: '14:20' },
      },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        food_preference: 'both',
        food_references: ['Dosa', 'Chicken Curry'],
        available_days: ['monday', 'saturday'],
        availability_mode: 'shared',
        availability_by_day: {
          monday: { from: '11:15', until: '14:20' },
          saturday: { from: '11:15', until: '14:20' },
        },
        kitchen_opening_time: '11:15:00',
        kitchen_closing_time: '14:20:00',
      }),
    );
    const insertedApplication = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertedApplication).not.toHaveProperty('profile_photo_path');
    expect(insertedApplication).not.toHaveProperty('terms_accepted_at');
  });

  it('rejects cook applications when closing is not after opening', async () => {
    const service = new ApplicationsService(null);
    await expect(
      service.submitCookApplication(
        {
          fullName: 'Test Cook',
          mobileNumber: '9876543210',
          email: 'cook@example.com',
          city: 'Bengaluru',
          pincode: '560001',
          foodPreference: 'vegetarian',
          foodReferences: ['Dosa'],
          availableDays: ['monday'],
          availabilityMode: 'shared',
          availabilityByDay: {
            monday: { from: '18:00', until: '10:00' },
          },
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a cook application without photo or terms fields', async () => {
    const service = new ApplicationsService(null);
    await expect(
      service.submitCookApplication({
        fullName: 'Test Cook',
        mobileNumber: '9876543210',
        email: 'cook@example.com',
        city: 'Bengaluru',
        pincode: '560001',
        foodPreference: 'both',
        foodReferences: ['Dosa', 'Chicken Curry'],
        availableDays: ['monday', 'saturday'],
        availabilityMode: 'shared',
        availabilityByDay: {
          monday: { from: '09:00', until: '17:00' },
          saturday: { from: '09:00', until: '17:00' },
        },
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns per-day schedules in the cook application admin detail', async () => {
    const availabilityByDay = {
      monday: { from: '07:00', until: '11:00' },
      saturday: { from: '13:00', until: '17:00' },
    };
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'cook-id',
        application_id: 'CK-20261120-ABC123',
        status: 'pending',
        full_name: 'Test Cook',
        mobile_number: '9876543210',
        email: 'cook@example.com',
        profile_photo_path: null,
        kitchen_name: null,
        kitchen_address: null,
        city: 'Bengaluru',
        pincode: '560001',
        years_experience: null,
        food_types: [],
        food_categories: [],
        special_dishes: null,
        food_preference: 'both',
        fssai_registration_number: null,
        kitchen_opening_time: '07:00:00',
        kitchen_closing_time: '17:00:00',
        available_days: ['monday', 'saturday'],
        availability_mode: 'per_day',
        availability_by_day: availabilityByDay,
        food_references: ['Dosa', 'Chicken Curry'],
        terms_accepted_at: null,
        retention_until: '2027-11-20T00:00:00.000Z',
        reviewed_at: null,
        reviewed_by: null,
        review_notes: null,
        created_at: '2026-11-20T00:00:00.000Z',
      },
      error: null,
    });
    const client = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await new ApplicationsService(client).getCookApplication('cook-id');
    expect(result.availabilityMode).toBe('per_day');
    expect(result.availabilityByDay).toEqual(availabilityByDay);
    expect(result.availableDays).toEqual(['monday', 'saturday']);
  });

  it('stores delivery partner work details without requiring photo or terms data', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        application_id: 'DP-20261120-ABC123',
        status: 'pending',
        created_at: '2026-11-20T00:00:00.000Z',
      },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const client = {
      from: jest.fn().mockReturnValue({ insert }),
    } as unknown as SupabaseClient;

    const service = new ApplicationsService(client);
    await service.submitDeliveryPartnerApplication({
      fullName: 'Rider',
      mobileNumber: '9876543210',
      email: 'rider@example.com',
      city: 'Bengaluru',
      pincode: '560001',
      ownsVehicle: true,
      vehicleType: 'bike',
      vehicleRegistrationNumber: 'ka01ab1234',
      availableDaysMode: 'weekdays',
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      workingHoursMode: 'custom',
      availableFrom: '18:30',
      availableUntil: '20:30',
    });

    expect(client.from).toHaveBeenCalledWith('delivery_partner_applications');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owns_vehicle: true,
        vehicle_type: 'bike',
        vehicle_registration_number: 'KA01AB1234',
        other_vehicle_description: null,
        can_arrange_vehicle: null,
        available_days_mode: 'weekdays',
        available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        work_preference: null,
        working_hours_mode: 'custom',
        available_from: '18:30',
        available_until: '20:30',
      }),
    );
    const insertedApplication = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertedApplication).not.toHaveProperty('profile_photo_path');
    expect(insertedApplication).not.toHaveProperty('terms_accepted_at');
    expect(insertedApplication).not.toHaveProperty('driving_license_number');
    expect(insertedApplication).not.toHaveProperty('current_address');
  });

  it('rejects invalid delivery work hours before database access', async () => {
    const service = new ApplicationsService(null);
    await expect(
      service.submitDeliveryPartnerApplication(
        {
          fullName: 'Rider',
          mobileNumber: '9876543210',
          email: 'rider@example.com',
          city: 'Bengaluru',
          pincode: '560001',
          ownsVehicle: false,
          availableDaysMode: 'choose_days',
          availableDays: ['sunday'],
          workingHoursMode: 'custom',
          availableFrom: '20:30',
          availableUntil: '18:00',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects vehicle details when the applicant does not own a vehicle', async () => {
    const service = new ApplicationsService(null);
    await expect(
      service.submitDeliveryPartnerApplication({
        fullName: 'Rider',
        mobileNumber: '9876543210',
        email: 'rider@example.com',
        city: 'Bengaluru',
        pincode: '560001',
        ownsVehicle: false,
        vehicleType: 'bike',
        vehicleRegistrationNumber: 'KA01AB1234',
        availableDaysMode: 'weekdays',
        availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        workingHoursMode: 'full_app',
        availableFrom: '18:00',
        availableUntil: '21:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns delivery work details in the admin application response', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'delivery-id',
        application_id: 'DP-20261120-ABC123',
        status: 'pending',
        full_name: 'Rider',
        mobile_number: '9876543210',
        email: 'rider@example.com',
        profile_photo_path: null,
        city: 'Bengaluru',
        pincode: '560001',
        owns_vehicle: true,
        vehicle_type: 'other',
        vehicle_registration_number: null,
        other_vehicle_description: 'Electric scooter',
        can_arrange_vehicle: null,
        available_days_mode: 'weekdays',
        available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        work_preference: 'full_time',
        working_hours_mode: 'custom',
        available_from: '18:30:00',
        available_until: '20:30:00',
      },
      error: null,
    });
    const client = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await new ApplicationsService(client).getDeliveryPartnerApplication(
      'delivery-id',
    );
    expect(result).toEqual(
      expect.objectContaining({
        ownsVehicle: true,
        vehicleType: 'other',
        vehicleRegistrationNumber: null,
        otherVehicleDescription: 'Electric scooter',
        canArrangeVehicle: null,
        availableDaysMode: 'weekdays',
        availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        workPreference: 'full_time',
        workingHoursMode: 'custom',
        availableFrom: '18:30:00',
        availableUntil: '20:30:00',
      }),
    );
  });

  it('stores no vehicle-specific answers for an applicant without a vehicle', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        application_id: 'DP-20261120-ABC123',
        status: 'pending',
        created_at: '2026-11-20T00:00:00.000Z',
      },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const client = {
      from: jest.fn().mockReturnValue({ insert }),
    } as unknown as SupabaseClient;
    const service = new ApplicationsService(client);
    const application = {
      fullName: 'Rider',
      mobileNumber: '9876543210',
      email: 'rider@example.com',
      city: 'Bengaluru',
      pincode: '560001',
      ownsVehicle: false,
      availableDaysMode: 'all_days' as const,
      availableDays: [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ],
      workingHoursMode: 'full_app' as const,
      availableFrom: '18:00',
      availableUntil: '21:00',
    };

    await service.submitDeliveryPartnerApplication(application);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owns_vehicle: false,
        vehicle_type: null,
        vehicle_registration_number: null,
        other_vehicle_description: null,
        can_arrange_vehicle: null,
        work_preference: null,
      }),
    );
  });

  it('saves an Other vehicle description without a registration number', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        application_id: 'DP-20261120-ABC123',
        status: 'pending',
        created_at: '2026-11-20T00:00:00.000Z',
      },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const client = {
      from: jest.fn().mockReturnValue({ insert }),
    } as unknown as SupabaseClient;
    const service = new ApplicationsService(client);

    await service.submitDeliveryPartnerApplication({
      fullName: 'Rider',
      mobileNumber: '9876543210',
      email: 'rider@example.com',
      city: 'Bengaluru',
      pincode: '560001',
      ownsVehicle: true,
      vehicleType: 'other',
      otherVehicleDescription: 'Electric scooter',
      availableDaysMode: 'all_days',
      availableDays: [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ],
      workingHoursMode: 'full_app',
      availableFrom: '18:00',
      availableUntil: '21:00',
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owns_vehicle: true,
        vehicle_type: 'other',
        vehicle_registration_number: null,
        other_vehicle_description: 'Electric scooter',
        can_arrange_vehicle: null,
        work_preference: null,
      }),
    );
  });
});
