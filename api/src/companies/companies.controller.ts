import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post()
  async create(@Request() req: any, @Body() dto: CreateCompanyDto) {
    if (req.user?.authType !== 'google') {
      throw new ForbiddenException(
        'Please sign in with Google to register a company',
      );
    }
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.create(userId, dto);
  }

  @Get('mine')
  async findMine(@Request() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.companiesService.findMine(userId);
  }
}
