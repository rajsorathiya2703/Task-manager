import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { EmployeesModule } from '../employees/employees.module';
import { ConfigModule } from '@nestjs/config';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [
    UsersModule,
    EmployeesModule,
    PassportModule,
    JwtModule.register({}),
    ConfigModule,
    AccessModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
