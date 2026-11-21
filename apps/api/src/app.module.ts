import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import {
  loadApiEnvFile,
  resolveApiEnvCandidates,
} from './config/load-api-env';
import { DishesModule } from './dishes/dishes.module';
import { HealthModule } from './health/health.module';
import { KitchensModule } from './kitchens/kitchens.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { SmsModule } from './sms/sms.module';
import { SupabaseModule } from './supabase/supabase.module';


// Apply apps/api/.env before ConfigModule merges process.env over the file.
loadApiEnvFile({ override: true });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: resolveApiEnvCandidates(),
      load: [configuration],
      validate: validateEnv,
    }),
    SupabaseModule,
    HealthModule,
    LocationsModule,
    KitchensModule,
    DishesModule,
    AuthModule,
    SmsModule,
    CartModule,
    NotificationsModule,
    OrdersModule,
    PaymentsModule,
    ApplicationsModule,
    AdminModule,
  ],
})
export class AppModule {}


