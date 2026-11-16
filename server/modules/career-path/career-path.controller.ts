import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CareerPath,
  CareerPathListResponse,
  CareerPathWithStages,
  CareerStage,
  CreateCareerPathRequest,
  GenerateCareerPlanRequest,
  UpdateStageStatusRequest,
} from '@shared/api.interface';
import { CareerPathService } from './career-path.service';

@Controller('api/career-path')
export class CareerPathController {
  constructor(private readonly careerPathService: CareerPathService) {}

  @NeedLogin()
  @Get()
  async list(@Req() req: Request): Promise<CareerPathListResponse> {
    const { userId } = req.userContext;
    return this.careerPathService.list(userId);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateCareerPathRequest,
  ): Promise<CareerPathWithStages> {
    const { userId } = req.userContext;
    if (!dto.targetJob) {
      throw new BadRequestException('目标岗位不能为空');
    }
    return this.careerPathService.create(userId, dto);
  }

  @NeedLogin()
  @Post('generate')
  async generatePlan(
    @Body() dto: GenerateCareerPlanRequest,
  ): Promise<CareerPathWithStages> {
    if (!dto.targetJob) {
      throw new BadRequestException('目标岗位不能为空');
    }
    if (!dto.durationMonths || dto.durationMonths < 1) {
      throw new BadRequestException('学习时长必须大于0');
    }
    return this.careerPathService.generatePlan(dto);
  }

  @NeedLogin()
  @Get(':id')
  async getDetail(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<CareerPathWithStages> {
    const { userId } = req.userContext;
    return this.careerPathService.getDetail(userId, id);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      title: string;
      description: string;
      targetJob: string;
      durationMonths: number;
      status: 'planning' | 'in_progress' | 'completed' | 'paused';
    }>,
  ): Promise<CareerPath> {
    const { userId } = req.userContext;
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    return this.careerPathService.update(userId, id, dto);
  }

  @NeedLogin()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<void> {
    const { userId } = req.userContext;
    await this.careerPathService.remove(userId, id);
  }

  @NeedLogin()
  @Patch('stage/:stageId')
  async updateStageStatus(
    @Req() req: Request,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageStatusRequest,
  ): Promise<CareerStage> {
    const { userId } = req.userContext;
    if (dto.isCompleted === undefined) {
      throw new BadRequestException('isCompleted不能为空');
    }
    return this.careerPathService.updateStageStatus(userId, stageId, dto);
  }

  @NeedLogin()
  @Get(':id/progress')
  async getProgress(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{
    totalStages: number;
    completedStages: number;
    currentStage: number;
    progressPercent: number;
    stages: Array<{
      id: string;
      title: string;
      sortOrder: number;
      isCompleted: boolean;
      completedAt?: string;
    }>;
  }> {
    const { userId } = req.userContext;
    return this.careerPathService.getProgress(userId, id);
  }
}
