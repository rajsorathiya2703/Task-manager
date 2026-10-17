import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const platformAdminEmail = (
      this.configService.get<string>('PLATFORM_ADMIN_EMAIL') ||
      process.env.PLATFORM_ADMIN_EMAIL ||
      'raj2732005@gmail.com'
    )
      .toLowerCase()
      .trim();

    const userEmail = (user?.email || '').toLowerCase().trim();

    if (!userEmail || userEmail !== platformAdminEmail) {
      throw new ForbiddenException('Platform admin only');
    }

    return true;
  }
}
