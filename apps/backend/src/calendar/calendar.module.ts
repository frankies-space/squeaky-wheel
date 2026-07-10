import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CalendarConnectionService } from './calendar-connection.service';
import { CalendarEventsService } from './calendar-events.service';
import { CalendarProviderService } from './calendar-provider.service';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [CalendarController],
  providers: [CalendarProviderService, CalendarConnectionService, CalendarEventsService],
  exports: [CalendarConnectionService, CalendarEventsService, CalendarProviderService],
})
export class CalendarModule {}
