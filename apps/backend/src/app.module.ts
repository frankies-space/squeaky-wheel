import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './db/database.module';
import { UsersModule } from './users/users.module';
import { VenturesModule } from './ventures/ventures.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    VenturesModule,
  ],
})
export class AppModule {}
