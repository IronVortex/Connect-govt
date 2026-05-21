import { Controller, Get, UseGuards, Request, Param, Inject } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('application-summary')
export class ApplicationController {
  constructor(@Inject(ApplicationService) private applicationService: ApplicationService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getSummary(@Request() req: any) {
    return this.applicationService.getSummaryForUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':userId')
  getSummaryByUser(@Param('userId') userId: string) {
    return this.applicationService.getSummaryForUser(userId);
  }
}
