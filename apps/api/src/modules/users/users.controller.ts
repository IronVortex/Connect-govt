import { Controller, Get, Put, Body, UseGuards, Request, Inject, Delete } from '@nestjs/common';
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
    @Body() body: { 
      name: string; 
      email: string; 
      profileImage?: string;
      gender?: string;
      dob?: string;
      nationality?: string;
      address?: string;
    },
  ) {
    return this.usersService.updateProfile(
      req.user.id,
      body.name,
      body.email,
      body.profileImage,
      body.gender,
      body.dob,
      body.nationality,
      body.address,
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

  @UseGuards(JwtAuthGuard)
  @Delete('profile')
  async deleteAccount(@Request() req: any) {
    await this.usersService.deleteAccount(req.user.id);
    return { success: true };
  }
}
