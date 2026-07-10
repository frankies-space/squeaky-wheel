import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AntiStallScoresResponse } from '@squeaky-wheel/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { AntiStallService } from './anti-stall.service';

@Controller('anti-stall')
@UseGuards(AuthGuard)
export class AntiStallController {
  constructor(
    private readonly antiStallService: AntiStallService,
    private readonly usersService: UsersService,
  ) {}

  @Get('scores')
  async getScores(@CurrentUser() user: AuthUser): Promise<AntiStallScoresResponse> {
    await this.usersService.ensureUser(user);
    return this.antiStallService.getScoresForUser(user.id);
  }
}
