import { Controller, Post, Body, Res, Req, Get, UseGuards, UnauthorizedException, Logger } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };
    res.cookie('access_token', accessToken, cookieOptions);
    res.cookie('refresh_token', refreshToken, cookieOptions);
  }

  @Public()
  @Post('guest')
  async createGuest(@Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.createGuest();
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return user;
  }

  @Public()
  @Post('google')
  async loginWithGoogle(
    @Body() body: GoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    let existingGuestId: string | undefined;
    if (req.cookies?.access_token) {
      try {
        const payload = this.jwtService.decode(req.cookies.access_token) as any;
        if (payload?.sub) existingGuestId = payload.sub;
      } catch (e) {}
    }
    
    const { user, tokens } = await this.authService.loginWithGoogle(body.token, existingGuestId);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return user;
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('No refresh token');
    
    const tokens = await this.authService.refresh(refreshToken);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.logger.log('User logged out (cookies cleared)');
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request) {
    return (req as any).user;
  }
}
