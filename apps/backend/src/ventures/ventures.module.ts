import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { VenturesController } from './ventures.controller';
import { VenturesService } from './ventures.service';

@Module({
  imports: [UsersModule],
  controllers: [VenturesController],
  providers: [VenturesService],
})
export class VenturesModule {}
