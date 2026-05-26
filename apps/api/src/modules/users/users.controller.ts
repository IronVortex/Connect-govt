import { Controller, Get, Put, Body, UseGuards, Request, Inject } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return this.usersService.findOne(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Request() req: any,
    @Body() body: { name: string; email: string; profileImage?: string },
  ) {
    return this.usersService.updateProfile(
      req.user.id,
      body.name,
      body.email,
      body.profileImage,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('password')
  async updatePassword(
    @Request() req: any,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    await this.usersService.updatePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
    return { success: true };
  }
}
