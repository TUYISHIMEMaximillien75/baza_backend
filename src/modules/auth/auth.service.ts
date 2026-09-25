import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      passwordHash,
    });

    return this.buildAuthResponse(user);
  }

  // ─── Login ────────────────────────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.usersService.updateLastLogin(user.id);

    return this.buildAuthResponse(user);
  }

  // ─── Get current user ─────────────────────────────────────────────────────────
  async getMe(userId: string): Promise<AuthUserDto> {
    const user = await this.usersService.findByIdOrThrow(userId);
    return this.toAuthUserDto(user);
  }

  // ─── Refresh token ───────────────────────────────────────────────────────────
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.usersService.findByIdOrThrow(payload.sub);
      const roles = user.roles?.map((r) => r.name) ?? [];

      const accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, roles },
        { expiresIn: '15m' },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private buildAuthResponse(user: User): AuthResponseDto {
    const roles = user.roles?.map((r) => r.name) ?? [];

    const payload = { sub: user.id, email: user.email, roles };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: '7d',
    });

    return {
      user: this.toAuthUserDto(user),
      accessToken,
      refreshToken,
    };
  }

  private toAuthUserDto(user: User): AuthUserDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
      status: user.status,
      emailVerified: user.emailVerified,
      roles: user.roles?.map((r) => r.name) ?? [],
    };
  }
}
