import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { VenturesModule } from '../ventures/ventures.module';
import { GoalsController, VentureGoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({
  imports: [AuthModule, UsersModule, VenturesModule, LlmModule, TasksModule],
  controllers: [GoalsController, VentureGoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
