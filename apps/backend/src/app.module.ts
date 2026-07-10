import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { AntiStallModule } from './anti-stall/anti-stall.module';
import { AuthModule } from './auth/auth.module';
import { CheckinModule } from './checkin/checkin.module';
import { CalendarModule } from './calendar/calendar.module';
import { DatabaseModule } from './db/database.module';
import { GoalsModule } from './goals/goals.module';
import { UsersModule } from './users/users.module';
import { VenturesModule } from './ventures/ventures.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '../../.env'),
      ],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    VenturesModule,
    GoalsModule,
    AntiStallModule,
    CheckinModule,
    CalendarModule,
  ],
})
export class AppModule {}
