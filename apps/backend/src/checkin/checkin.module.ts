import { Module } from '@nestjs/common';
import { AntiStallModule } from '../anti-stall/anti-stall.module';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { UsersModule } from '../users/users.module';
import { CheckinController } from './checkin.controller';

@Module({
  imports: [AuthModule, UsersModule, AntiStallModule, LlmModule],
  controllers: [CheckinController],
})
export class CheckinModule {}
