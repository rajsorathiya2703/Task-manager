import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Membership, MembershipSchema } from '../companies/schemas/membership.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
    forwardRef(() => CompaniesModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
