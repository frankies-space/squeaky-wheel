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
  CreateVentureRequest,
  UpdateVentureRequest,
  VentureResponse,
} from '@squeaky-wheel/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser, CurrentUser } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { CreateVentureDto } from './dto/create-venture.dto';
import { UpdateVentureDto } from './dto/update-venture.dto';
import { VenturesService } from './ventures.service';

@Controller('ventures')
@UseGuards(AuthGuard)
export class VenturesController {
  constructor(
    private readonly venturesService: VenturesService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<VentureResponse[]> {
    await this.usersService.ensureUser(user);
    return this.venturesService.list(user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateVentureDto,
  ): Promise<VentureResponse> {
    await this.usersService.ensureUser(user);
    return this.venturesService.create(user.id, body satisfies CreateVentureRequest);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VentureResponse> {
    await this.usersService.ensureUser(user);
    return this.venturesService.getById(user.id, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateVentureDto,
  ): Promise<VentureResponse> {
    await this.usersService.ensureUser(user);
    return this.venturesService.update(user.id, id, body satisfies UpdateVentureRequest);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.usersService.ensureUser(user);
    await this.venturesService.remove(user.id, id);
  }
}
