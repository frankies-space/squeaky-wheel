import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  CreateGoalRequest,
  DecomposeGoalResponse,
  GoalResponse,
  TaskResponse,
  UpdateGoalRequest,
} from '@squeaky-wheel/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../auth/auth.service';
import { DecompositionService } from '../llm/decomposition.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { DecomposeGoalDto } from './dto/decompose-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalsService } from './goals.service';

@Controller('goals')
@UseGuards(AuthGuard)
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly usersService: UsersService,
    private readonly decompositionService: DecompositionService,
    private readonly tasksService: TasksService,
  ) {}

  @Post(':id/decompose')
  async decompose(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DecomposeGoalDto,
  ): Promise<DecomposeGoalResponse> {
    await this.usersService.ensureUser(user);
    return this.decompositionService.decomposeGoal({
      userId: user.id,
      goalId: id,
      additionalContext: body.additionalContext,
    });
  }

  @Get(':id/tasks')
  async listTasks(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskResponse[]> {
    await this.usersService.ensureUser(user);
    return this.tasksService.listByGoal(user.id, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateGoalDto,
  ): Promise<GoalResponse> {
    await this.usersService.ensureUser(user);
    return this.goalsService.update(user.id, id, body satisfies UpdateGoalRequest);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.usersService.ensureUser(user);
    await this.goalsService.remove(user.id, id);
  }
}

@Controller('ventures/:ventureId/goals')
@UseGuards(AuthGuard)
export class VentureGoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Param('ventureId', ParseUUIDPipe) ventureId: string,
  ): Promise<GoalResponse[]> {
    await this.usersService.ensureUser(user);
    return this.goalsService.listByVenture(user.id, ventureId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Param('ventureId', ParseUUIDPipe) ventureId: string,
    @Body() body: CreateGoalDto,
  ): Promise<GoalResponse> {
    await this.usersService.ensureUser(user);
    return this.goalsService.create(user.id, ventureId, body satisfies CreateGoalRequest);
  }
}
