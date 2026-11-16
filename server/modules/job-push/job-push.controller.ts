import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { JobPushService } from './job-push.service';
import type {
  JobPushListResponse,
  JobPushItem,
} from '@shared/api.interface';
import type { Request } from 'express';

@Controller('api/job-push')
export class JobPushController {
  constructor(private readonly service: JobPushService) {}

  @Get()
  getPushList(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Req() req?: Request,
  ): Promise<JobPushListResponse> {
    const userId = req?.userContext?.userId;
    return this.service.getPushList(userId, status, Number(page), Number(pageSize));
  }

  @Post(':id/view')
  markViewed(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = req.userContext.userId;
    return this.service.markViewed(id, userId);
  }

  @Post(':id/apply')
  markApplied(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = req.userContext.userId;
    return this.service.markApplied(id, userId);
  }

  @Post(':id/ignore')
  markIgnored(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = req.userContext.userId;
    return this.service.markIgnored(id, userId);
  }

  @Post('refresh')
  refresh(@Req() req: Request): Promise<{ newCount: number }> {
    const userId = req.userContext.userId;
    return this.service.refresh(userId);
  }

  @Get('stats/new-count')
  getNewCount(@Req() req: Request): Promise<{ count: number }> {
    const userId = req.userContext.userId;
    return this.service.getNewCount(userId);
  }
}
