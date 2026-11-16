import { Controller, Get, Query, Req } from '@nestjs/common';
import { PersonalizedRecService } from './personalized-rec.service';
import type { PersonalizedRecommendations } from '@shared/api.interface';
import type { Request } from 'express';

@Controller('api/personalized-rec')
export class PersonalizedRecController {
  constructor(private readonly service: PersonalizedRecService) {}

  @Get('dashboard')
  getDashboardRecommendations(
    @Query('limit') limit = '5',
    @Req() req?: Request,
  ): Promise<PersonalizedRecommendations> {
    const userId = req?.userContext?.userId;
    return this.service.getDashboardRecommendations(userId, Number(limit));
  }

  @Get('jobs')
  getJobRecommendations(
    @Query('limit') limit = '10',
    @Req() req?: Request,
  ) {
    const userId = req?.userContext?.userId;
    return this.service.getByType(userId, 'job', Number(limit));
  }

  @Get('courses')
  getCourseRecommendations(
    @Query('limit') limit = '10',
    @Req() req?: Request,
  ) {
    const userId = req?.userContext?.userId;
    return this.service.getByType(userId, 'course', Number(limit));
  }

  @Get('news')
  getNewsRecommendations(
    @Query('limit') limit = '10',
    @Req() req?: Request,
  ) {
    const userId = req?.userContext?.userId;
    return this.service.getByType(userId, 'news', Number(limit));
  }

  @Get('refresh')
  refreshRecommendations(@Req() req: Request): Promise<{ updated: boolean }> {
    const { userId } = req.userContext;
    return this.service.refresh(userId);
  }
}
