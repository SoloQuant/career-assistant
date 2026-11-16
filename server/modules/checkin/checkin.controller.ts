import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { CheckinService } from './checkin.service';
import type {
  StudyCheckin,
  CreateCheckinRequest,
  UpdateCheckinRequest,
  CheckinStats,
  CheckinCalendarResponse,
  CheckinListResponse,
} from '@shared/api.interface';

@Controller('api/checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @NeedLogin()
  @Post()
  async upsertToday(
    @Req() req: Request,
    @Body() dto: CreateCheckinRequest,
  ): Promise<StudyCheckin> {
    const { userId } = req.userContext;
    if (!dto.checkinDate) {
      throw new BadRequestException('打卡日期不能为空');
    }
    if (dto.durationMinutes === undefined || dto.durationMinutes === null) {
      throw new BadRequestException('学习时长不能为空');
    }
    if (!dto.content) {
      throw new BadRequestException('学习内容不能为空');
    }
    return this.checkinService.upsertToday(userId, dto);
  }

  @NeedLogin()
  @Get('today')
  async getToday(@Req() req: Request): Promise<StudyCheckin | null> {
    const { userId } = req.userContext;
    return this.checkinService.getToday(userId);
  }

  @NeedLogin()
  @Get('stats')
  async getStats(@Req() req: Request): Promise<CheckinStats> {
    const { userId } = req.userContext;
    return this.checkinService.getStats(userId);
  }

  @NeedLogin()
  @Get('calendar')
  async getCalendar(
    @Req() req: Request,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ): Promise<CheckinCalendarResponse> {
    const { userId } = req.userContext;
    const now = new Date();
    // 用 Asia/Shanghai 取当前年月
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const defaultYear = Number(parts.find(p => p.type === 'year')?.value);
    const defaultMonth = Number(parts.find(p => p.type === 'month')?.value);

    const year = yearStr ? Number(yearStr) : defaultYear;
    const month = monthStr ? Number(monthStr) : defaultMonth;

    if (Number.isNaN(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('年份无效');
    }
    if (Number.isNaN(month) || month < 1 || month > 12) {
      throw new BadRequestException('月份无效');
    }

    return this.checkinService.getCalendar(userId, year, month);
  }

  @NeedLogin()
  @Get()
  async getList(
    @Req() req: Request,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
  ): Promise<CheckinListResponse> {
    const { userId } = req.userContext;
    const page = pageStr ? Number(pageStr) : 1;
    const pageSize = pageSizeStr ? Number(pageSizeStr) : 20;

    if (Number.isNaN(page) || page < 1) {
      throw new BadRequestException('页码无效');
    }
    if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('每页数量无效');
    }

    return this.checkinService.getList(userId, page, pageSize);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCheckinRequest,
  ): Promise<StudyCheckin> {
    const { userId } = req.userContext;
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    return this.checkinService.update(userId, id, dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string): Promise<void> {
    const { userId } = req.userContext;
    await this.checkinService.remove(userId, id);
  }
}
