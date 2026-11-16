import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { CompanyReviewService } from './company-review.service';
import type {
  CompanyReview,
  CompanyReviewListResponse,
  CreateCompanyReviewRequest,
} from '@shared/api.interface';

interface CompanyReviewAggregate {
  companyName: string;
  avgOverallRating: number;
  reviewCount: number;
  avgWorkLifeBalance: number;
  avgSalary: number;
  avgGrowth: number;
  avgCulture: number;
  recentReviews: CompanyReview[];
}

@Controller('api/company-review')
export class CompanyReviewController {
  constructor(private readonly companyReviewService: CompanyReviewService) {}

  @Get()
  async getList(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('companyName') companyName?: string,
    @Query('sort') sort?: string,
  ): Promise<CompanyReviewListResponse> {
    const page = pageStr ? Number(pageStr) : 1;
    const pageSize = pageSizeStr ? Number(pageSizeStr) : 20;

    if (Number.isNaN(page) || page < 1) {
      throw new BadRequestException('页码无效');
    }
    if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('每页数量无效');
    }
    if (sort && sort !== 'rating' && sort !== 'time') {
      throw new BadRequestException('排序参数无效');
    }

    return this.companyReviewService.getList(page, pageSize, companyName, sort);
  }

  @Get('company/:name')
  async getCompanyAggregate(@Param('name') name: string): Promise<CompanyReviewAggregate> {
    if (!name) {
      throw new BadRequestException('公司名称不能为空');
    }
    return this.companyReviewService.getCompanyAggregate(decodeURIComponent(name));
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<CompanyReview> {
    return this.companyReviewService.getById(id);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateCompanyReviewRequest,
  ): Promise<CompanyReview> {
    const { userId } = req.userContext;
    if (!dto.companyName) {
      throw new BadRequestException('公司名称不能为空');
    }
    if (dto.overallRating === undefined || dto.overallRating === null) {
      throw new BadRequestException('综合评分不能为空');
    }
    return this.companyReviewService.create(userId, dto);
  }

  @NeedLogin()
  @Post(':id/helpful')
  async markHelpful(@Param('id') id: string): Promise<{ helpfulCount: number }> {
    return this.companyReviewService.markHelpful(id);
  }
}
