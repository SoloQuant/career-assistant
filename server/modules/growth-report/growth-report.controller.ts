import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { GrowthReportService } from './growth-report.service';
import type {
  GrowthReportItem,
  GrowthReportListResponse,
  GenerateReportRequest,
} from '@shared/api.interface';

const REPORT_TYPES = ['weekly', 'monthly'] as const;

@Controller('api/growth-report')
export class GrowthReportController {
  constructor(private readonly growthReportService: GrowthReportService) {}

  @NeedLogin()
  @Get()
  async getList(
    @Req() req: Request,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('reportType') reportType?: string,
  ): Promise<GrowthReportListResponse> {
    const { userId } = req.userContext;
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 10;
    if (Number.isNaN(page) || page < 1) {
      throw new BadRequestException('page 无效');
    }
    if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('pageSize 无效');
    }
    if (reportType && !REPORT_TYPES.includes(reportType as typeof REPORT_TYPES[number])) {
      throw new BadRequestException('reportType 无效');
    }
    return this.growthReportService.getList(userId, {
      page,
      pageSize,
      reportType: reportType as typeof REPORT_TYPES[number] | undefined,
    });
  }

  @NeedLogin()
  @Get(':id')
  async getDetail(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<GrowthReportItem> {
    const { userId } = req.userContext;
    return this.growthReportService.getDetail(userId, id);
  }

  @NeedLogin()
  @Post('generate')
  async generateReport(
    @Req() req: Request,
    @Body() dto: GenerateReportRequest,
  ): Promise<GrowthReportItem> {
    const { userId } = req.userContext;
    if (!dto.reportType || !REPORT_TYPES.includes(dto.reportType)) {
      throw new BadRequestException('reportType 无效');
    }
    return this.growthReportService.generateReport(userId, dto);
  }

  @NeedLogin()
  @Delete(':id')
  async deleteReport(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<void> {
    const { userId } = req.userContext;
    await this.growthReportService.deleteReport(userId, id);
  }
}
