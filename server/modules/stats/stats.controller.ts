import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';
import type {
  RadarChartData,
  SkillGrowthDataPoint,
  ApplicationStats,
  TaskStats,
} from '@shared/api.interface';

interface OverviewStats {
  skillsCount: number;
  tasksCount: number;
  applicationsCount: number;
  taskCompletionRate: number;
  applicationStatusDistribution: ApplicationStats;
}

interface SkillDistributionItem {
  name: string;
  value: number;
  category: string;
}

interface JobMatchDistribution {
  range: string;
  count: number;
}

@Controller('api/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  async getOverview(): Promise<OverviewStats> {
    return this.statsService.getOverview();
  }

  @Get('radar')
  async getRadar(): Promise<RadarChartData[]> {
    return this.statsService.getRadarData();
  }

  @Get('skill-distribution')
  async getSkillDistribution(): Promise<SkillDistributionItem[]> {
    return this.statsService.getSkillDistribution();
  }

  @Get('growth')
  async getGrowth(): Promise<SkillGrowthDataPoint[]> {
    return this.statsService.getGrowthCurve();
  }

  @Get('job-match')
  async getJobMatch(): Promise<JobMatchDistribution[]> {
    return this.statsService.getJobMatchDistribution();
  }

  @Get('task-completion')
  async getTaskCompletion(): Promise<TaskStats> {
    return this.statsService.getTaskStats();
  }

  @Get('application-status')
  async getApplicationStatus(): Promise<ApplicationStats> {
    return this.statsService.getApplicationStats();
  }
}
