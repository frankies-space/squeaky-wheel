import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type {
  EveningCheckinResponse,
  TodayCheckinResponse,
} from '@squeaky-wheel/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../auth/auth.service';
import { DailyProposalService } from '../llm/daily-proposal.service';
import { UsersService } from '../users/users.service';
import { CheckinService } from './checkin.service';
import { CompleteEveningCheckinDto } from './dto/complete-evening.dto';
import { ValidateTaskCountDto } from './dto/validate-task-count.dto';
import { EveningCheckinService } from './evening-checkin.service';

@Controller('checkin')
@UseGuards(AuthGuard)
export class CheckinController {
  constructor(
    private readonly checkinService: CheckinService,
    private readonly eveningCheckinService: EveningCheckinService,
    private readonly dailyProposalService: DailyProposalService,
    private readonly usersService: UsersService,
  ) {}

  @Get('today')
  async getToday(@CurrentUser() user: AuthUser): Promise<TodayCheckinResponse> {
    await this.usersService.ensureUser(user);
    return this.checkinService.getToday(user.id);
  }

  @Post('today/confirm')
  async confirmToday(@CurrentUser() user: AuthUser): Promise<TodayCheckinResponse> {
    await this.usersService.ensureUser(user);
    return this.checkinService.confirmToday(user.id);
  }

  @Post('today/replan')
  async replanToday(@CurrentUser() user: AuthUser): Promise<TodayCheckinResponse> {
    await this.usersService.ensureUser(user);
    return this.checkinService.replanToday(user.id);
  }

  @Get('evening')
  async getEvening(@CurrentUser() user: AuthUser): Promise<EveningCheckinResponse> {
    await this.usersService.ensureUser(user);
    return this.eveningCheckinService.getEvening(user.id);
  }

  @Post('evening/complete')
  async completeEvening(
    @CurrentUser() user: AuthUser,
    @Body() body: CompleteEveningCheckinDto,
  ): Promise<EveningCheckinResponse> {
    await this.usersService.ensureUser(user);
    return this.eveningCheckinService.completeEvening(user.id, body);
  }

  @Post('validate-task-count')
  async validateTaskCount(
    @CurrentUser() user: AuthUser,
    @Body() body: ValidateTaskCountDto,
  ): Promise<{ valid: boolean; message?: string }> {
    await this.usersService.ensureUser(user);
    try {
      this.dailyProposalService.validateProposalTaskCount(body.taskCount);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Invalid task count',
      };
    }
  }
}
