import { Controller, Post, Body, Res, Req, Get, UseGuards, UnauthorizedException, Logger } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EmployeesService } from '../employees/employees.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request) {
    const user = (req as any).user;
    if (!user) return null;

    const userId = user._id?.toString() || user.id;
    const email = user.email;

    let employee: any = null;
    if (userId) {
      employee = await this.employeesService.findByUserId(userId);
    }
    if (!employee && email) {
      employee = await this.employeesService.findByEmail(email);
      if (employee && !employee.userId && userId) {
        await this.employeesService.linkUserByEmail(email, user._id);
      }
    }

    const hasEmployee = Boolean(employee);
    if (user.is_employee !== hasEmployee && userId) {
      user.is_employee = hasEmployee;
      await this.usersService.updateUser(userId, { is_employee: hasEmployee });
    }

    const userObj = user.toObject ? user.toObject() : { ...user };
    userObj.is_employee = hasEmployee;
    if (employee) {
      userObj.employeeId = employee._id;
    }
    return userObj;
  }
}
