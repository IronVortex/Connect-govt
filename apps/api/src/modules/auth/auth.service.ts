import { Injectable, BadRequestException, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../../models/User';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly refreshJwtSecret: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(JwtService) private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.jwtSecret = configService.get<string>('JWT_SECRET') || '';
    this.refreshJwtSecret = configService.get<string>('JWT_REFRESH_SECRET') || this.jwtSecret;
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel
      .findOne({ email })
      .select('+password')
      .exec();
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, refreshTokenHash, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = this.buildJwtPayload(user);
    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);
    await this.storeRefreshToken(user._id, refreshToken);
    return {
      access_token: accessToken,
      user,
      refresh_token: refreshToken,
    };
  }

  async register(email: string, password: string, name: string) {
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('Email already registered.');
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new this.userModel({ email, password: hashedPassword, name });
    await user.save();
    const { password: _, refreshTokenHash, ...result } = user.toObject();
    return result;
  }

  async refreshToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.refreshJwtSecret,
        ignoreExpiration: false,
      });
      const user = await this.userModel
        .findById(payload.sub)
        .select('+refreshTokenHash')
        .exec();
      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Refresh token revoked');
      }
      const isValid = await bcrypt.compare(token, user.refreshTokenHash);
      if (!isValid) {
        throw new UnauthorizedException('Refresh token invalid');
      }
      const jwtPayload = this.buildJwtPayload(user.toObject());
      const accessToken = await this.generateAccessToken(jwtPayload);
      const refreshToken = await this.generateRefreshToken(jwtPayload);
      await this.storeRefreshToken(user._id.toString(), refreshToken);
      return { access_token: accessToken, refresh_token: refreshToken, user: jwtPayload };
    } catch (error) {
      throw new UnauthorizedException('Unable to refresh session');
    }
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash: null }).exec();
  }

  private buildJwtPayload(user: any) {
    return {
      email: user.email,
      sub: user._id,
      role: user.role,
      name: user.name,
    };
  }

  private async generateAccessToken(payload: Record<string, any>) {
    return this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: '15m',
    });
  }

  private async generateRefreshToken(payload: Record<string, any>) {
    return this.jwtService.signAsync(payload, {
      secret: this.refreshJwtSecret,
      expiresIn: '7d',
    });
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 12);
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash: hash }).exec();
  }
}
