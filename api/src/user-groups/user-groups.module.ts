import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserGroupsService } from './user-groups.service';
import { UserGroupsController } from './user-groups.controller';
import { UserGroup, UserGroupSchema } from './schemas/user-group.schema';
import { PermissionAuditLog, PermissionAuditLogSchema } from './schemas/permission-audit-log.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PermissionCacheService } from '../permissions/permission-cache.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserGroup.name, schema: UserGroupSchema },
      { name: PermissionAuditLog.name, schema: PermissionAuditLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UserGroupsController],
  providers: [UserGroupsService, PermissionCacheService],
  exports: [UserGroupsService, PermissionCacheService],
})
export class UserGroupsModule {}

