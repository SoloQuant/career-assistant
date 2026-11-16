import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  FinanceNewsListResponse,
  NewsRefreshStatus,
} from '@shared/api.interface';
import { FinanceNewsService } from './finance-news.service';

@Controller('api/finance-news')
export class FinanceNewsController {
  constructor(private readonly financeNewsService: FinanceNewsService) {}

  @Get('list')
  async getList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('source') source?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<FinanceNewsListResponse> {
    const pageNum: number = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const pageSizeNum: number = Math.min(
      50,
      Math.max(1, pageSize ? parseInt(pageSize, 10) || 20 : 20),
    );
    const validSortBy = sortBy === 'importance' ? 'importance' : 'publish_date';
    const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    if (res) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    return this.financeNewsService.getList({
      page: pageNum,
      pageSize: pageSizeNum,
      source,
      category,
      keyword,
      sortBy: validSortBy,
      sortOrder: validSortOrder,
    });
  }

  @Get('important')
  async getImportantNews(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('importantCategory') importantCategory?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Req() req?: Request,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<FinanceNewsListResponse> {
    const pageNum: number = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const pageSizeNum: number = Math.min(
      50,
      Math.max(1, pageSize ? parseInt(pageSize, 10) || 20 : 20),
    );
    const unreadOnlyFlag: boolean = unreadOnly === 'true' || unreadOnly === '1';

    const userId: string | undefined = (req?.userContext as { userId?: string } | undefined)?.userId;
    if (res) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    return this.financeNewsService.getImportantNews({
      page: pageNum,
      pageSize: pageSizeNum,
      importantCategory,
      unreadOnly: unreadOnlyFlag,
      userId,
    });
  }

  @NeedLogin()
  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext as { userId: string };
    if (!id) {
      throw new BadRequestException('文章ID不能为空');
    }
    return this.financeNewsService.markAsRead(id, userId);
  }

  @NeedLogin()
  @Post('mark-all-read')
  async markAllRead(
    @Req() req: Request,
  ): Promise<{ success: boolean; count: number }> {
    const { userId } = req.userContext as { userId: string };
    return this.financeNewsService.markAllImportantRead(userId);
  }

  @Get('stats')
  async getStats(@Res({ passthrough: true }) res?: Response): Promise<NewsRefreshStatus> {
    if (res) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    return this.financeNewsService.getStats();
  }

  @Post('refresh')
  async refresh(): Promise<{ success: boolean; newCount: number; lastRefreshAt: string }> {
    return this.financeNewsService.refresh();
  }
}
