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
  ALLOWED_PROFILE_PHOTO_MIME,
  APPLICATION_PHOTO_BUCKET,
  APPLICATION_RETENTION_DAYS,
  MAX_PROFILE_PHOTO_BYTES,
  type ApplicationStatus,
} from './applications.constants';
import type { ReviewApplicationDto } from './dto/review-application.dto';
import type { SubmitCookApplicationDto } from './dto/submit-cook-application.dto';
import type { SubmitDeliveryPartnerApplicationDto } from './dto/submit-delivery-partner-application.dto';

type UploadedPhoto = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly adminClient: SupabaseClient | null,
  ) {}

  async submitCookApplication(
    dto: SubmitCookApplicationDto,
    photo: UploadedPhoto | undefined,
  ) {
    this.assertTermsAccepted(dto.termsAccepted);
    this.assertClosingAfterOpening(dto.kitchenOpeningTime, dto.kitchenClosingTime);
    const client = this.requireAdmin();
    const photoPath = await this.uploadProfilePhoto(client, 'cook', photo);
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
        profile_photo_path: photoPath ?? null,
        kitchen_name: dto.kitchenName,
        kitchen_address: dto.kitchenAddress,
        city: dto.city,
        pincode: dto.pincode,
        years_experience: dto.yearsExperience,
        food_types: dto.foodTypes,
        food_categories: dto.foodCategories,
        special_dishes: dto.specialDishes?.trim() || null,
        food_preference: dto.foodPreference,
        fssai_registration_number: dto.fssaiRegistrationNumber?.trim() || null,
        kitchen_opening_time: `${dto.kitchenOpeningTime}:00`,
        kitchen_closing_time: `${dto.kitchenClosingTime}:00`,
        available_days: dto.availableDays,
        terms_accepted_at: now.toISOString(),
        retention_until: retentionUntil.toISOString(),
      })
      .select('id, application_id, status, created_at')
      .single();

    if (error) {
      if (photoPath) await this.safeRemovePhoto(client, photoPath);
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
    photo: UploadedPhoto | undefined,
  ) {
    this.assertTermsAccepted(dto.termsAccepted);

    const client = this.requireAdmin();
    const photoPath = await this.uploadProfilePhoto(client, 'delivery', photo);
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
        profile_photo_path: photoPath ?? null,
        current_address: dto.currentAddress,
        city: dto.city,
        pincode: dto.pincode,
        vehicle_registration_number: dto.vehicleRegistrationNumber.toUpperCase(),
        driving_license_number: dto.drivingLicenseNumber.toUpperCase(),
        preferred_delivery_area: dto.preferredDeliveryArea,
        available_days: dto.availableDays,
        work_preference: dto.workPreference,
        terms_accepted_at: now.toISOString(),
        retention_until: retentionUntil.toISOString(),
      })
      .select('id, application_id, status, created_at')
      .single();

    if (error) {
      if (photoPath) await this.safeRemovePhoto(client, photoPath);
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
        'id, application_id, status, full_name, mobile_number, email, kitchen_name, city, food_preference, created_at, reviewed_at',
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
      availableDays: data.available_days,
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
      vehicleRegistrationNumber: data.vehicle_registration_number,
      drivingLicenseNumber: data.driving_license_number,
      preferredDeliveryArea: data.preferred_delivery_area,
      availableDays: data.available_days,
      workPreference: data.work_preference,
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

  private async uploadProfilePhoto(
    client: SupabaseClient,
    kind: 'cook' | 'delivery',
    photo: UploadedPhoto | undefined,
  ): Promise<string | null> {
    if (!photo) {
      return null;
    }
    if (photo.size <= 0 || photo.size > MAX_PROFILE_PHOTO_BYTES) {
      throw new BadRequestException('Profile photo must be an image up to 5 MB.');
    }
    if (!ALLOWED_PROFILE_PHOTO_MIME.has(photo.mimetype)) {
      throw new BadRequestException('Profile photo must be JPEG, PNG, or WebP.');
    }

    const extension =
      photo.mimetype === 'image/png'
        ? 'png'
        : photo.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const path = `${kind}/${new Date().toISOString().slice(0, 10)}/${randomBytes(16).toString('hex')}.${extension}`;

    const { error } = await client.storage
      .from(APPLICATION_PHOTO_BUCKET)
      .upload(path, photo.buffer, {
        contentType: photo.mimetype,
        upsert: false,
      });

    if (error) {
      throw new ServiceUnavailableException(
        'Unable to store profile photo securely. Please try again.',
      );
    }

    return path;
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

  private async safeRemovePhoto(client: SupabaseClient, path: string) {
    try {
      await client.storage.from(APPLICATION_PHOTO_BUCKET).remove([path]);
    } catch {
      // Best-effort cleanup after a failed insert.
    }
  }

  private assertTermsAccepted(accepted: boolean) {
    if (!accepted) {
      throw new BadRequestException(
        'You must accept Aahaa Terms & Conditions and Privacy Policy.',
      );
    }
  }

  private assertClosingAfterOpening(open: string, close: string) {
    const [oh, om] = open.split(':').map(Number);
    const [ch, cm] = close.split(':').map(Number);
    const openMinutes = oh * 60 + om;
    const closeMinutes = ch * 60 + cm;
    if (closeMinutes <= openMinutes) {
      throw new BadRequestException(
        'Kitchen closing time must be later than opening time. Overnight hours are not supported.',
      );
    }
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
