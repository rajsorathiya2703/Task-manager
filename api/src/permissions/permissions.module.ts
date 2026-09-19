import { Global, Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';

@Global()
@Module({
  controllers: [PermissionsController],
})
export class PermissionsModule {}
