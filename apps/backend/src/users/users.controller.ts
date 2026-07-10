import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { UpdateUserRequest, UserResponse } from '@squeaky-wheel/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../auth/auth.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser): Promise<UserResponse> {
    await this.usersService.ensureUser(user);
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateUserDto,
  ): Promise<UserResponse> {
    await this.usersService.ensureUser(user);
    return this.usersService.updateMe(user.id, body satisfies UpdateUserRequest);
  }
}
