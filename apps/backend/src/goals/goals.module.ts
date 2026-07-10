import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { VenturesModule } from '../ventures/ventures.module';
import { GoalsController, VentureGoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({
  imports: [AuthModule, UsersModule, VenturesModule],
  controllers: [GoalsController, VentureGoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
