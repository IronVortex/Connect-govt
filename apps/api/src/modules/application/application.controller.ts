import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Controller()
export class ApplicationController {
  constructor(private applicationService: ApplicationService) {}

  @UseGuards(JwtAuthGuard)
  @Post('applications')
  createApplication(@Request() req: any, @Body() body: CreateApplicationDto) {
    return this.applicationService.createApplication(req.user.id, body.serviceId, body.notes);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications')
  getApplications(@Request() req: any) {
    return this.applicationService.getApplicationsForUser(req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications/:id')
  getApplication(@Request() req: any, @Param('id') id: string) {
    return this.applicationService.getApplicationById(id, req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Put('applications/:id')
  updateApplication(@Request() req: any, @Param('id') id: string, @Body() body: UpdateApplicationDto) {
    return this.applicationService.updateApplication(id, req.user.id, req.user.role, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('applications/:id')
  deleteApplication(@Request() req: any, @Param('id') id: string) {
    return this.applicationService.softDeleteApplication(id, req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('application-summary')
  getSummary(@Request() req: any) {
    return this.applicationService.getSummaryForUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('application-summary/:userId')
  getSummaryByUser(@Param('userId') userId: string) {
    return this.applicationService.getSummaryForUser(userId);
  }
}
