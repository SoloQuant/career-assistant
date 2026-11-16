import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  IndustryTrendItem,
  SalaryPredictionResult,
  SalaryPredictionRequest,
  SkillJobHeatmapItem,
  CompetitivenessAnalysis,
  CityCostItem,
  JobCompetitionItem,
  JobCompetitionListResponse,
} from '@shared/api.interface';
import { IndustryTrendService } from './industry-trend.service';

interface SalaryTrendPoint {
  period: string;
  avgSalary: number;
  demandCount: number;
  trendDirection: string;
  trendPercentage: number;
}

interface CityComparisonItem {
  city: string;
  avgSalary: number;
  demandCount: number;
  trendDirection: string;
}

interface TopSkillItem {
  skillName: string;
  count: number;
  trend: 'rising' | 'stable' | 'declining';
}

interface JobDemandItem {
  jobType: string;
  demandCount: number;
  trendDirection: string;
  trendPercentage: number;
}

interface PredictionLogItem extends SalaryPredictionResult {
  id: string;
  createdAt: string;
}

interface CityCostListResponse {
  items: CityCostItem[];
}

interface DeliveryFunnelStage {
  name: string;
  count: number;
  rate: number;
}

interface DeliveryFunnelConversionRate {
  name: string;
  value: number;
}

interface DeliveryFunnelResponse {
  stages: DeliveryFunnelStage[];
  applicationCount: number;
  responseCount: number;
  interviewCount: number;
  offerCount: number;
  conversionRates: DeliveryFunnelConversionRate[];
  bottleneck: string;
}

@Controller('api/industry-trend')
export class IndustryTrendController {
  constructor(private readonly industryTrendService: IndustryTrendService) {}

  @Get('salary-trend')
  async getSalaryTrend(
    @Query('jobType') jobType?: string,
    @Query('city') city?: string,
  ): Promise<SalaryTrendPoint[]> {
    if (!jobType) {
      throw new BadRequestException('jobType 必填');
    }
    if (!city) {
      throw new BadRequestException('city 必填');
    }
    return this.industryTrendService.getSalaryTrend(jobType, city);
  }

  @Get('city-comparison')
  async getCityComparison(
    @Query('jobType') jobType?: string,
  ): Promise<CityComparisonItem[]> {
    if (!jobType) {
      throw new BadRequestException('jobType 必填');
    }
    return this.industryTrendService.getCityComparison(jobType);
  }

  @Get('top-skills')
  async getTopSkills(
    @Query('jobType') jobType?: string,
    @Query('period') period?: string,
  ): Promise<TopSkillItem[]> {
    return this.industryTrendService.getTopSkills(jobType, period);
  }

  @Get('job-demand')
  async getJobDemand(
    @Query('city') city?: string,
  ): Promise<JobDemandItem[]> {
    return this.industryTrendService.getJobDemand(city);
  }

  @NeedLogin()
  @Post('salary-prediction')
  async predictSalary(
    @Req() req: Request,
    @Body() dto: SalaryPredictionRequest,
  ): Promise<SalaryPredictionResult> {
    const { userId } = req.userContext;
    if (!dto.city) {
      throw new BadRequestException('city 必填');
    }
    if (!dto.jobType) {
      throw new BadRequestException('jobType 必填');
    }
    if (!Array.isArray(dto.skills)) {
      throw new BadRequestException('skills 必须为数组');
    }
    if (dto.experienceYears === undefined || dto.experienceYears === null) {
      throw new BadRequestException('experienceYears 必填');
    }
    return this.industryTrendService.predictSalary(userId, dto);
  }

  @NeedLogin()
  @Get('salary-prediction/history')
  async getPredictionHistory(
    @Req() req: Request,
  ): Promise<PredictionLogItem[]> {
    const { userId } = req.userContext;
    return this.industryTrendService.getPredictionHistory(userId);
  }

  @Get('skill-job-heatmap')
  async getSkillJobHeatmap(): Promise<SkillJobHeatmapItem[]> {
    return this.industryTrendService.getSkillJobHeatmap();
  }

  @NeedLogin()
  @Get('competitiveness-analysis')
  async getCompetitivenessAnalysis(
    @Req() req: Request,
    @Query('targetJob') targetJob?: string,
  ): Promise<CompetitivenessAnalysis> {
    const { userId } = req.userContext;
    if (!targetJob) {
      throw new BadRequestException('targetJob 必填');
    }
    return this.industryTrendService.getCompetitivenessAnalysis(
      userId,
      targetJob,
    );
  }

  @Get('city-cost-comparison')
  async getCityCostComparison(
    @Query('jobType') _jobType?: string,
  ): Promise<CityCostListResponse> {
    return this.industryTrendService.getCityCostComparison();
  }

  @Get('job-competition')
  async getJobCompetitionList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('jobType') jobType?: string,
    @Query('city') city?: string,
    @Query('sort') sort?: string,
  ): Promise<JobCompetitionListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    return this.industryTrendService.getJobCompetitionList({
      page: pageNum,
      pageSize: pageSizeNum,
      jobType,
      city,
      sort,
    });
  }

  @Get('job-competition/:id')
  async getJobCompetitionDetail(
    @Param('id') id: string,
  ): Promise<JobCompetitionItem> {
    const item: JobCompetitionItem | null =
      await this.industryTrendService.getJobCompetitionDetail(id);
    if (!item) {
      throw new BadRequestException('岗位竞争数据不存在');
    }
    return item;
  }

  @NeedLogin()
  @Get('delivery-funnel')
  async getDeliveryFunnel(
    @Req() req: Request,
  ): Promise<DeliveryFunnelResponse> {
    const { userId } = req.userContext;
    return this.industryTrendService.getDeliveryFunnel(userId);
  }
}
