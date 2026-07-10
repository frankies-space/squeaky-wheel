import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type {
  CalendarConnectMockResponse,
  CalendarConnectionStatus,
  CalendarOAuthStartResponse,
} from '@squeaky-wheel/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { CalendarConnectionService } from './calendar-connection.service';
import { CalendarProviderService } from './calendar-provider.service';
import { CompleteOAuthDto } from './dto/complete-oauth.dto';

@Controller('calendar')
@UseGuards(AuthGuard)
export class CalendarController {
  constructor(
    private readonly connections: CalendarConnectionService,
    private readonly provider: CalendarProviderService,
    private readonly usersService: UsersService,
  ) {}

  @Get('status')
  async status(@CurrentUser() user: AuthUser): Promise<CalendarConnectionStatus> {
    await this.usersService.ensureUser(user);
    return this.connections.getStatus(user.id);
  }

  @Get('oauth/start')
  async startOAuth(@CurrentUser() user: AuthUser): Promise<CalendarOAuthStartResponse> {
    await this.usersService.ensureUser(user);
    const { authUrl, mock } = this.provider.buildOAuthStartUrl(user.id);
    return {
      authUrl,
      provider: 'google',
      mock,
    };
  }

  @Post('oauth/complete')
  async completeOAuth(
    @CurrentUser() user: AuthUser,
    @Body() body: CompleteOAuthDto,
  ): Promise<CalendarConnectionStatus> {
    await this.usersService.ensureUser(user);
    const tokens = await this.provider.exchangeCodeForTokens(body.code);
    await this.connections.upsertGoogleConnection(user.id, tokens);
    return this.connections.getStatus(user.id);
  }

  @Post('connect/mock')
  async connectMock(@CurrentUser() user: AuthUser): Promise<CalendarConnectMockResponse> {
    await this.usersService.ensureUser(user);
    const tokens = await this.provider.exchangeCodeForTokens('mock');
    const connection = await this.connections.upsertGoogleConnection(user.id, tokens);
    return {
      connected: true,
      provider: 'google',
      connectionId: connection.id,
    };
  }
}
