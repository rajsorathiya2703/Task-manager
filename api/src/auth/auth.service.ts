import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { EmployeesService } from '../employees/employees.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private employeesService: EmployeesService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || 'placeholder';
    this.googleClient = new OAuth2Client(clientId);
  }

  async createGuest() {
    const guestId = uuidv4();
    const user = await this.usersService.createUser({
      authType: 'guest',
      guestId,
      lastLoginAt: new Date(),
    });
    this.logger.log(`New guest user created with ID: ${user._id}`);
    const tokens = await this.issueTokens(user._id.toString());
    return { user, tokens };
  }

  async loginWithGoogle(token: string, existingGuestId?: string) {
    let payload;
    try {
      // First try to verify it as an ID token
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (e) {
      // If it fails, assume it's an access_token (which useGoogleLogin provides)
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Invalid token');
        payload = await response.json();
      } catch (err) {
        this.logger.warn('Failed login attempt with invalid Google token');
        throw new UnauthorizedException('Invalid Google token');
      }
    }

    if (!payload || !payload.sub) {
      this.logger.warn('Failed login attempt: no subject found in payload');
      throw new UnauthorizedException('Invalid Google token');
    }

    const { sub: googleId, email, name, picture: avatarUrl } = payload;
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;

    let user = await this.usersService.findByGoogleId(googleId);

    // If not found by googleId, check by normalized email
    if (!user && cleanEmail) {
      user = await this.usersService.findByEmail(cleanEmail);
      if (user) {
        user.googleId = googleId;
        user.authType = 'google';
        if (name) user.name = name;
        if (avatarUrl) user.avatarUrl = avatarUrl;
      }
    }

    if (user) {
      user.lastLoginAt = new Date();
      if (cleanEmail && !user.email) user.email = cleanEmail;
      if (name && !user.name) user.name = name;
      if (avatarUrl && !user.avatarUrl) user.avatarUrl = avatarUrl;
      await user.save();
      this.logger.log(`User logged in via Google: ${user._id} (${cleanEmail})`);
    } else {
      if (existingGuestId) {
        user = await this.usersService.findByGuestId(existingGuestId);
      }
      
      if (user) {
        user.authType = 'google';
        user.googleId = googleId;
        user.email = cleanEmail;
        user.name = name;
        user.avatarUrl = avatarUrl;
        user.lastLoginAt = new Date();
        await user.save();
        this.logger.log(`Guest user ${user._id} upgraded to Google account (${cleanEmail})`);
      } else {
        user = await this.usersService.createUser({
          authType: 'google',
          googleId,
          email: cleanEmail,
          name,
          avatarUrl,
          lastLoginAt: new Date(),
        });
        this.logger.log(`New user registered via Google: ${user._id} (${cleanEmail})`);
      }
    }

    // Auto-link any existing Employee record that shares this email
    if (cleanEmail && user?._id) {
      try {
        const linkedEmployee = await this.employeesService.linkUserByEmail(cleanEmail, user._id);
        if (linkedEmployee) {
          this.logger.log(`Auto-linked Employee #${linkedEmployee._id} to User #${user._id} via email (${cleanEmail})`);
        }
      } catch (linkErr) {
        this.logger.warn(`Failed to auto-link employee for ${cleanEmail}: ${linkErr}`);
      }
    }

    const tokens = await this.issueTokens(user._id.toString());
    return { user, tokens };
  }

  async issueTokens(userId: string) {
    const payload = { sub: userId };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.validateUser(payload.sub);
      if (!user) {
        this.logger.warn(`Token refresh failed: User ${payload.sub} not found`);
        throw new UnauthorizedException('User not found');
      }
      
      this.logger.log(`User ${user._id} refreshed their tokens`);
      const tokens = await this.issueTokens(user._id.toString());
      return tokens;
    } catch (e) {
      this.logger.warn(`Invalid refresh token provided`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string): Promise<UserDocument | null> {
    return this.usersService.findById(userId);
  }
}
