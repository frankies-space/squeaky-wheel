import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { TodayCheckinResponse } from '@squeaky-wheel/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../auth/auth.service';
import { DailyProposalService } from '../llm/daily-proposal.service';
import { UsersService } from '../users/users.service';
import { CheckinService } from './checkin.service';
import { ValidateTaskCountDto } from './dto/validate-task-count.dto';

@Controller('checkin')
@UseGuards(AuthGuard)
export class CheckinController {
  constructor(
    private readonly checkinService: CheckinService,
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
