import { Module } from '@nestjs/common';
import { AntiStallModule } from '../anti-stall/anti-stall.module';
import { AuthModule } from '../auth/auth.module';
import { CalendarModule } from '../calendar/calendar.module';
import { LlmModule } from '../llm/llm.module';
import { UsersModule } from '../users/users.module';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { EveningCheckinService } from './evening-checkin.service';

@Module({
  imports: [AuthModule, UsersModule, AntiStallModule, LlmModule, CalendarModule],
  controllers: [CheckinController],
  providers: [CheckinService, EveningCheckinService],
})
export class CheckinModule {}
