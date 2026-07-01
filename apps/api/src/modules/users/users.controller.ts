import { Controller, Get, Put, Body, UseGuards, Request, Inject, Delete, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

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

  // ── Admin-only management endpoints ─────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'suspended' },
  ) {
    return this.usersService.updateStatus(id, body.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() body: { role: 'user' | 'admin' },
  ) {
    return this.usersService.updateRole(id, body.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async adminDeleteUser(@Param('id') id: string) {
    await this.usersService.deleteAccount(id);
    return { success: true };
  }
}
