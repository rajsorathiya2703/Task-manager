import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AccessModule } from '../access/access.module';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { Membership, MembershipSchema } from '../companies/schemas/membership.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
    UsersModule,
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

