import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserGroupsService } from './user-groups.service';
import { UserGroupsController } from './user-groups.controller';
import { UserGroup, UserGroupSchema } from './schemas/user-group.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserGroup.name, schema: UserGroupSchema }]),
  ],
  controllers: [UserGroupsController],
  providers: [UserGroupsService],
  exports: [UserGroupsService],
})
export class UserGroupsModule {}

