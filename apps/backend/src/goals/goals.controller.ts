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
  GoalResponse,
  UpdateGoalRequest,
} from '@squeaky-wheel/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalsService } from './goals.service';

@Controller('goals')
@UseGuards(AuthGuard)
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly usersService: UsersService,
  ) {}

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
