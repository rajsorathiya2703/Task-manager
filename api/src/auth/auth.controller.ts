import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  Query,
  UseGuards,
  UnauthorizedException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { SkipTrialCheck } from '../companies/skip-trial-check.decorator';
import { CompaniesService } from '../companies/companies.service';
import { JwtService } from '@nestjs/jwt';
import { AccessService } from '../access/access.service';
import { NoTenant } from '../common/tenant.decorators';
import { EmployeesService } from '../employees/employees.service';

@NoTenant()
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly accessService: AccessService,
    @Optional()
    @Inject(forwardRef(() => EmployeesService))
    private readonly employeesService?: EmployeesService,
    @Optional()
    @Inject(forwardRef(() => CompaniesService))
    private readonly companiesService?: CompaniesService,
  ) {}

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
    };
    res.cookie('access_token', accessToken, cookieOptions);
    res.cookie('refresh_token', refreshToken, cookieOptions);
  }

  @Public()
  @Post('guest')
  async createGuest(@Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.createGuest();
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return {
      _id: user._id,
      authType: 'guest',
      lastLoginAt: user.lastLoginAt,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  }

  @Public()
  @Post('google')
  async loginWithGoogle(
    @Body() body: GoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    let existingGuestId: string | undefined =
      body.guestId || (req.cookies as any)?.guestId || (req.cookies as any)?.guest_id;
    if (!existingGuestId && req.cookies?.access_token) {
      try {
        const payload = this.jwtService.decode(req.cookies.access_token) as any;
        if (payload?.guestId) {
          existingGuestId = payload.guestId;
        } else if (payload?.sub) {
          existingGuestId = payload.sub;
        }
      } catch (e) {}
    }
    
    const { user, tokens } = await this.authService.loginWithGoogle(body.token, existingGuestId);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return {
      _id: user._id,
      authType: user.authType,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      lastLoginAt: user.lastLoginAt,
    };
  }

  @SkipTrialCheck()
  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('No refresh token');
    
    const tokens = await this.authService.refresh(refreshToken);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  @SkipTrialCheck()
  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.logger.log('User logged out (cookies cleared)');
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
    };
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    return { success: true };
  }

  /**
   * GET /auth/me
   * Returns current user (safe fields) + memberships array [{ companySlug, companyName, isCompanyOwner, status }].
   * If ?company=slug is provided and the caller is an active member, also includes
   * membership: { roleIds, isCompanyOwner, employeeId }.
   */
  @SkipTrialCheck()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @Req() req: Request,
    @Query('company') companySlug?: string,
  ) {
    const user = (req as any).user;
    if (!user) return null;

    if (user.email && this.employeesService) {
      await this.employeesService.activateForUser(user);
    }

    const userId = (user._id?.toString() || user.id || '').toString();

    // Safe user fields — never expose googleId, guestId, or internal secrets
    const safeUser = {
      _id: user._id || user.id,
      authType: user.authType || 'google',
      email: user.email || null,
      name: user.name || null,
      avatarUrl: user.avatarUrl || null,
      lastLoginAt: user.lastLoginAt || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const memberships = await this.authService.getUserMemberships(userId);

    let token = req.cookies?.access_token;
    if (!token && userId) {
      try {
        const tokens = await this.authService.issueTokens(userId);
        token = tokens.accessToken;
      } catch (e) {}
    }

    const response: any = {
      ...safeUser,
      memberships,
      token,
    };

    const resolvedCompanySlug =
      (companySlug && companySlug.trim()) ||
      ((req.headers?.['x-company-slug'] || req.headers?.['x-company-id']) as string) ||
      undefined;

    let activeCompanyId: string | undefined = undefined;
    if (resolvedCompanySlug && resolvedCompanySlug.trim()) {
      const activeMembership = await this.authService.getCompanyMembership(
        userId,
        resolvedCompanySlug.trim(),
      );
      if (activeMembership) {
        response.membership = activeMembership;
        activeCompanyId = activeMembership.companyId;
      }
    }

    if (userId) {
      try {
        const effectiveAccess = await this.accessService.getEffectiveAccess(
          userId,
          activeCompanyId,
        );
        response.roles = effectiveAccess.roles;
        response.policyVersion = effectiveAccess.policyVersion;
        response.access = effectiveAccess.access;
      } catch (e) {
        // Fallback if access service snapshot is unavailable
      }
    }

    const platformAdminEmail = (
      process.env.PLATFORM_ADMIN_EMAIL || 'raj2732005@gmail.com'
    )
      .toLowerCase()
      .trim();
    response.isPlatformAdmin = Boolean(
      user.email && user.email.toLowerCase().trim() === platformAdminEmail,
    );

    if (this.companiesService) {
      try {
        response.subscription =
          await this.companiesService.getSubscriptionForUser(
            userId,
            companySlug || activeCompanyId,
          );
      } catch (subErr) {
        // Fallback if subscription lookup encounters an error
      }
    }

    return response;
  }
}


