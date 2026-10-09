import { Module, forwardRef } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { CompaniesModule } from '../companies/companies.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [AccessModule, forwardRef(() => CompaniesModule)],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
