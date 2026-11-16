import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
} from '@nestjs/common';
import type { JobItem } from '@shared/api.interface';
import { JobService } from './job.service';

@Controller('api/jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get('recommended')
  async recommended(
    @Query('city') city?: string,
    @Query('jobType') jobType?: string,
    @Query('source') source?: string,
    @Query('salaryMin') salaryMin?: string,
    @Query('salaryMax') salaryMax?: string,
  ): Promise<JobItem[]> {
    return this.jobService.getRecommendedJobs({
      city,
      jobType,
      source,
      salaryMin: salaryMin !== undefined ? parseInt(salaryMin, 10) : undefined,
      salaryMax: salaryMax !== undefined ? parseInt(salaryMax, 10) : undefined,
    });
  }

  @Get()
  async list(
    @Query('city') city?: string,
    @Query('jobType') jobType?: string,
    @Query('source') source?: string,
    @Query('salaryMin') salaryMin?: string,
    @Query('salaryMax') salaryMax?: string,
  ): Promise<JobItem[]> {
    return this.jobService.findAll({
      city,
      jobType,
      source,
      salaryMin: salaryMin !== undefined ? parseInt(salaryMin, 10) : undefined,
      salaryMax: salaryMax !== undefined ? parseInt(salaryMax, 10) : undefined,
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<JobItem> {
    const item: JobItem | null = await this.jobService.findById(id);
    if (!item) {
      throw new NotFoundException('岗位不存在');
    }
    return item;
  }
}
