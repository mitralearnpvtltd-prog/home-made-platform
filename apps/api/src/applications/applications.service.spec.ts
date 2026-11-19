import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  it('rejects cook applications when closing is not after opening', async () => {
    const service = new ApplicationsService(null);
    await expect(
      service.submitCookApplication(
        {
          fullName: 'Test Cook',
          mobileNumber: '9876543210',
          email: 'cook@example.com',
          kitchenName: 'Home Kitchen',
          kitchenAddress: '123 Street',
          city: 'Bengaluru',
          pincode: '560001',
          yearsExperience: 3,
          foodTypes: ['homemade_meals'],
          foodCategories: ['lunch'],
          foodPreference: 'vegetarian',
          kitchenOpeningTime: '18:00',
          kitchenClosingTime: '10:00',
          availableDays: ['monday'],
          termsAccepted: true,
        },
        {
          buffer: Buffer.from('fake'),
          mimetype: 'image/jpeg',
          originalname: 'a.jpg',
          size: 4,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects delivery partner applications without terms acceptance', async () => {
    const service = new ApplicationsService(null);
    await expect(
      service.submitDeliveryPartnerApplication(
        {
          fullName: 'Rider',
          mobileNumber: '9876543210',
          email: 'rider@example.com',
          currentAddress: 'Somewhere',
          city: 'Bengaluru',
          pincode: '560001',
          vehicleRegistrationNumber: 'KA01AB1234',
          drivingLicenseNumber: 'KA0120190001234',
          preferredDeliveryArea: 'HSR Layout',
          availableDays: ['monday'],
          workPreference: 'full_time',
          termsAccepted: false,
        },
        {
          buffer: Buffer.from('fake'),
          mimetype: 'image/jpeg',
          originalname: 'a.jpg',
          size: 4,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows delivery partner submission without a profile photo until storage is reached', async () => {
    const service = new ApplicationsService(null);
    await expect(
      service.submitDeliveryPartnerApplication(
        {
          fullName: 'Rider',
          mobileNumber: '9876543210',
          email: 'rider@example.com',
          currentAddress: 'Somewhere',
          city: 'Bengaluru',
          pincode: '560001',
          vehicleRegistrationNumber: 'KA01AB1234',
          drivingLicenseNumber: 'KA0120190001234',
          preferredDeliveryArea: 'HSR Layout',
          availableDays: ['monday'],
          workPreference: 'full_time',
          termsAccepted: true,
        },
        undefined,
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
