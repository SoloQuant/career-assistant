import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { LearningPlanService } from './learning-plan.service';
import type {
  LearningPlanListResponse,
  LearningPlanDetail,
  LearningPlanAdjustRequest,
  LearningPlanReplanningRequest,
} from '@shared/api.interface';
import type { Request } from 'express';

@Controller('api/learning-plan')
export class LearningPlanController {
  constructor(private readonly service: LearningPlanService) {}

  @Get()
  async getPlans(@Req() req: Request): Promise<LearningPlanListResponse> {
    const { userId } = req.userContext;
    return this.service.getPlans(userId);
  }

  @Get(':id')
  getPlanDetail(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<LearningPlanDetail> {
    const { userId } = req.userContext;
    return this.service.getPlanDetail(id, userId);
  }

  @Get('active/current')
  getCurrentPlan(@Req() req: Request): Promise<LearningPlanDetail> {
    const { userId } = req.userContext;
    return this.service.getCurrentPlan(userId);
  }

  @Patch('item/:itemId/adjust')
  adjustItem(
    @Param('itemId') itemId: string,
    @Body() dto: LearningPlanAdjustRequest,
    @Req() req: Request,
  ): Promise<void> {
    const { userId } = req.userContext;
    return this.service.adjustItem(itemId, dto, userId);
  }

  @Post('replanning')
  replan(
    @Body() dto: LearningPlanReplanningRequest,
    @Req() req: Request,
  ): Promise<LearningPlanDetail> {
    const { userId } = req.userContext;
    return this.service.replan(dto.planId, userId);
  }
}
