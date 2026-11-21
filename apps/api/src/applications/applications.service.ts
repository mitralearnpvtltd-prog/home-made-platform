import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { normalizeIndianPhone } from '../auth/auth.utils';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.constants';
import {
  getAvailabilityRange,
  isValidAvailabilitySchedule,
} from './availability-schedule';
import {
  APPLICATION_PHOTO_BUCKET,
  APPLICATION_RETENTION_DAYS,
  type ApplicationStatus,
} from './applications.constants';
import type { ReviewApplicationDto } from './dto/review-application.dto';
import type { SubmitCookApplicationDto } from './dto/submit-cook-application.dto';
import type { SubmitDeliveryPartnerApplicationDto } from './dto/submit-delivery-partner-application.dto';
import {
  isValidAvailableDays,
  isValidWorkingHours,
} from './delivery-application.validation';

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly adminClient: SupabaseClient | null,
  ) {}

  async submitCookApplication(
    dto: SubmitCookApplicationDto,
  ) {
    if (
      dto.availabilityMode !== 'shared' ||
      !isValidAvailabilitySchedule(
        dto.availableDays,
        dto.availabilityMode,
        dto.availabilityByDay,
      )
    ) {
      throw new BadRequestException(
        'Provide valid availability times for every selected day.',
      );
    }
    const availabilityRange = getAvailabilityRange(dto.availabilityByDay);
    if (!availabilityRange) {
      throw new BadRequestException(
        'Select at least one valid kitchen availability day.',
      );
    }
    const client = this.requireAdmin();
    const mobile = normalizeIndianPhone(dto.mobileNumber);
    const email = dto.email.trim().toLowerCase();
    const applicationId = this.buildApplicationId('CK');
    const now = new Date();
    const retentionUntil = this.addDays(now, APPLICATION_RETENTION_DAYS);

    const { data, error } = await client
      .from('cook_applications')
      .insert({
        application_id: applicationId,
        status: 'pending',
        full_name: dto.fullName,
        mobile_number: mobile,
        mobile_normalized: mobile,
        email: dto.email.trim(),
        email_normalized: email,
        city: dto.city,
        pincode: dto.pincode,
        food_preference: dto.foodPreference,
        food_references: dto.foodReferences,
        availability_mode: dto.availabilityMode,
        availability_by_day: dto.availabilityByDay,
        kitchen_opening_time: `${availabilityRange.from}:00`,
        kitchen_closing_time: `${availabilityRange.until}:00`,
        available_days: dto.availableDays,
        retention_until: retentionUntil.toISOString(),
      })
      .select('id, application_id, status, created_at')
      .single();

    if (error) {
      this.throwInsertError(error, 'cook');
    }

    return {
      applicationId: data.application_id as string,
      status: data.status as ApplicationStatus,
      createdAt: data.created_at as string,
      message:
        'Thank you for applying to become an Aahaa Home Cook! Your application has been received and is pending review.',
    };
  }

  async submitDeliveryPartnerApplication(
    dto: SubmitDeliveryPartnerApplicationDto,
  ) {
    if (!isValidAvailableDays(dto.availableDaysMode, dto.availableDays)) {
      throw new BadRequestException(
        'Choose working days that match the selected option.',
      );
    }
    if (
      !isValidWorkingHours(
        dto.workingHoursMode,
        dto.availableFrom,
        dto.availableUntil,
      )
    ) {
      throw new BadRequestException(
        'Working hours must be within 6:00 PM–9:00 PM and end after they start.',
      );
    }
    const vehicleType = dto.ownsVehicle ? dto.vehicleType : undefined;
    const registration = dto.vehicleRegistrationNumber?.trim();
    const otherVehicleDescription = dto.otherVehicleDescription?.trim();
    const hasVehicleDetails = Boolean(
      dto.vehicleType || registration || otherVehicleDescription,
    );
    if (!dto.ownsVehicle && hasVehicleDetails) {
      throw new BadRequestException(
        'Vehicle details can only be provided when you own a vehicle.',
      );
    }

    const supportedVehicleTypes = ['bike', 'car', 'auto', 'other'];
    if (dto.ownsVehicle && !supportedVehicleTypes.includes(vehicleType ?? '')) {
      throw new BadRequestException('Select which vehicle you own.');
    }

    let vehicleRegistrationNumber: string | undefined;
    let savedOtherVehicleDescription: string | undefined;
    if (dto.ownsVehicle && vehicleType === 'other') {
      if (registration) {
        throw new BadRequestException(
          'A registration number is not needed for an Other vehicle type.',
        );
      }
      if (
        !otherVehicleDescription ||
        otherVehicleDescription.length < 2 ||
        otherVehicleDescription.length > 80
      ) {
        throw new BadRequestException('Specify your vehicle type.');
      }
      savedOtherVehicleDescription = otherVehicleDescription;
    } else if (dto.ownsVehicle) {
      if (
        !registration ||
        registration.length < 4 ||
        registration.length > 20
      ) {
        throw new BadRequestException(
          'Enter your vehicle registration number.',
        );
      }
      if (otherVehicleDescription) {
        throw new BadRequestException(
          'A vehicle description is only allowed for Other.',
        );
      }
      vehicleRegistrationNumber = registration.toUpperCase();
    }
    const client = this.requireAdmin();
    const mobile = normalizeIndianPhone(dto.mobileNumber);
    const email = dto.email.trim().toLowerCase();
    const applicationId = this.buildApplicationId('DP');
    const now = new Date();
    const retentionUntil = this.addDays(now, APPLICATION_RETENTION_DAYS);

    const { data, error } = await client
      .from('delivery_partner_applications')
      .insert({
        application_id: applicationId,
        status: 'pending',
        full_name: dto.fullName,
        mobile_number: mobile,
        mobile_normalized: mobile,
        email: dto.email.trim(),
        email_normalized: email,
        city: dto.city,
        pincode: dto.pincode,
        owns_vehicle: dto.ownsVehicle,
        vehicle_type: dto.ownsVehicle ? vehicleType : null,
        vehicle_registration_number: vehicleRegistrationNumber ?? null,
        other_vehicle_description: savedOtherVehicleDescription ?? null,
        can_arrange_vehicle: null,
        available_days: dto.availableDays,
        available_days_mode: dto.availableDaysMode,
        work_preference: null,
        working_hours_mode: dto.workingHoursMode,
        available_from: dto.availableFrom,
        available_until: dto.availableUntil,
        retention_until: retentionUntil.toISOString(),
      })
      .select('id, application_id, status, created_at')
      .single();

    if (error) {
      this.throwInsertError(error, 'delivery');
    }

    return {
      applicationId: data.application_id as string,
      status: data.status as ApplicationStatus,
      createdAt: data.created_at as string,
      message:
        'Thank you for applying to become an Aahaa Delivery Partner! Your application has been received and is pending review.',
    };
  }

  async listCookApplications(status?: ApplicationStatus) {
    const client = this.requireAdmin();
    let query = client
      .from('cook_applications')
      .select(
        'id, application_id, status, full_name, mobile_number, email, city, food_preference, created_at, reviewed_at',
      )
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) {
      throw new ServiceUnavailableException('Unable to list cook applications.');
    }
    return data ?? [];
  }

  async listDeliveryPartnerApplications(status?: ApplicationStatus) {
    const client = this.requireAdmin();
    let query = client
      .from('delivery_partner_applications')
      .select(
        'id, application_id, status, full_name, mobile_number, email, city, work_preference, created_at, reviewed_at',
      )
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) {
      throw new ServiceUnavailableException(
        'Unable to list delivery partner applications.',
      );
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      applicationId: row.application_id,
      status: row.status,
      fullName: row.full_name,
      mobileNumber: row.mobile_number,
      email: row.email,
      city: row.city,
      workPreference: row.work_preference,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
    }));
  }

  async getCookApplication(id: string) {
    const client = this.requireAdmin();
    const { data, error } = await client
      .from('cook_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Cook application not found.');
    }
    const photoUrl = await this.createSignedPhotoUrl(
      client,
      data.profile_photo_path ? String(data.profile_photo_path) : null,
    );
    return {
      id: data.id,
      applicationId: data.application_id,
      status: data.status,
      fullName: data.full_name,
      mobileNumber: data.mobile_number,
      email: data.email,
      profilePhotoUrl: photoUrl,
      kitchenName: data.kitchen_name,
      kitchenAddress: data.kitchen_address,
      city: data.city,
      pincode: data.pincode,
      yearsExperience: data.years_experience,
      foodTypes: data.food_types,
      foodCategories: data.food_categories,
      specialDishes: data.special_dishes,
      foodPreference: data.food_preference,
      fssaiRegistrationNumber: data.fssai_registration_number,
      kitchenOpeningTime: data.kitchen_opening_time,
      kitchenClosingTime: data.kitchen_closing_time,
      availableFrom: data.kitchen_opening_time,
      availableUntil: data.kitchen_closing_time,
      availableDays: data.available_days,
      availabilityMode: data.availability_mode ?? 'shared',
      availabilityByDay: data.availability_by_day ?? {},
      foodReferences:
        data.food_references ??
        (data.special_dishes ? [String(data.special_dishes)] : []),
      termsAcceptedAt: data.terms_accepted_at,
      retentionUntil: data.retention_until,
      reviewedAt: data.reviewed_at,
      reviewedBy: data.reviewed_by,
      reviewNotes: data.review_notes,
      createdAt: data.created_at,
    };
  }

  async getDeliveryPartnerApplication(id: string) {
    const client = this.requireAdmin();
    const { data, error } = await client
      .from('delivery_partner_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Delivery partner application not found.');
    }
    const photoUrl = await this.createSignedPhotoUrl(
      client,
      data.profile_photo_path ? String(data.profile_photo_path) : null,
    );
    return {
      id: data.id,
      applicationId: data.application_id,
      status: data.status,
      fullName: data.full_name,
      mobileNumber: data.mobile_number,
      email: data.email,
      profilePhotoUrl: photoUrl,
      currentAddress: data.current_address,
      city: data.city,
      pincode: data.pincode,
      ownsVehicle: data.owns_vehicle,
      vehicleType: data.vehicle_type,
      vehicleRegistrationNumber: data.vehicle_registration_number,
      otherVehicleDescription: data.other_vehicle_description,
      canArrangeVehicle: data.can_arrange_vehicle,
      drivingLicenseNumber: data.driving_license_number,
      preferredDeliveryArea: data.preferred_delivery_area,
      availableDays: data.available_days,
      availableDaysMode: data.available_days_mode,
      workPreference: data.work_preference,
      workingHoursMode: data.working_hours_mode,
      availableFrom: data.available_from,
      availableUntil: data.available_until,
      termsAcceptedAt: data.terms_accepted_at,
      retentionUntil: data.retention_until,
      reviewedAt: data.reviewed_at,
      reviewedBy: data.reviewed_by,
      reviewNotes: data.review_notes,
      createdAt: data.created_at,
    };
  }

  async reviewCookApplication(
    id: string,
    dto: ReviewApplicationDto,
    adminUserId: string,
  ) {
    return this.reviewApplication('cook_applications', id, dto, adminUserId);
  }

  async reviewDeliveryPartnerApplication(
    id: string,
    dto: ReviewApplicationDto,
    adminUserId: string,
  ) {
    return this.reviewApplication(
      'delivery_partner_applications',
      id,
      dto,
      adminUserId,
    );
  }

  private async reviewApplication(
    table: 'cook_applications' | 'delivery_partner_applications',
    id: string,
    dto: ReviewApplicationDto,
    adminUserId: string,
  ) {
    const client = this.requireAdmin();
    const { data: existing, error: findError } = await client
      .from(table)
      .select('id, status, application_id')
      .eq('id', id)
      .maybeSingle();
    if (findError || !existing) {
      throw new NotFoundException('Application not found.');
    }
    if (existing.status !== 'pending') {
      throw new ConflictException('This application has already been reviewed.');
    }

    const { data, error } = await client
      .from(table)
      .update({
        status: dto.status,
        review_notes: dto.reviewNotes?.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id, application_id, status, reviewed_at')
      .maybeSingle();

    if (error || !data) {
      throw new ConflictException('Unable to update application status.');
    }

    return {
      id: data.id,
      applicationId: data.application_id,
      status: data.status,
      reviewedAt: data.reviewed_at,
    };
  }

  private async createSignedPhotoUrl(
    client: SupabaseClient,
    path: string | null,
  ): Promise<string | null> {
    if (!path) return null;
    const { data, error } = await client.storage
      .from(APPLICATION_PHOTO_BUCKET)
      .createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  private buildApplicationId(prefix: 'CK' | 'DP'): string {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${stamp}-${suffix}`;
  }

  private addDays(from: Date, days: number): Date {
    const next = new Date(from);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private throwInsertError(
    error: { code?: string; message?: string },
    kind: 'cook' | 'delivery',
  ): never {
    if (error.code === '23505') {
      throw new ConflictException(
        kind === 'cook'
          ? 'A pending cook application already exists for this mobile number or email.'
          : 'A pending delivery partner application already exists for this mobile number or email.',
      );
    }
    throw new ServiceUnavailableException(
      'Unable to submit application right now. Please try again later.',
    );
  }

  private requireAdmin(): SupabaseClient {
    if (!this.adminClient) {
      throw new ServiceUnavailableException(
        'Application service is unavailable (Supabase service role not configured).',
      );
    }
    return this.adminClient;
  }
}
