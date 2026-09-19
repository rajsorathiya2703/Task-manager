import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserGroupsService } from './user-groups.service';
import { UserGroupsController } from './user-groups.controller';
import { UserGroup, UserGroupSchema } from './schemas/user-group.schema';
import { SeedGroupsService } from './seed-groups.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserGroup.name, schema: UserGroupSchema }]),
  ],
  controllers: [UserGroupsController],
  providers: [UserGroupsService, SeedGroupsService],
  exports: [UserGroupsService],
})
export class UserGroupsModule {}
