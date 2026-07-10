import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AntiStallController } from './anti-stall.controller';
import { AntiStallService } from './anti-stall.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [AntiStallController],
  providers: [AntiStallService],
  exports: [AntiStallService],
})
export class AntiStallModule {}
