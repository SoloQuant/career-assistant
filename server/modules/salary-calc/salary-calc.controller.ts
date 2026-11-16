import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { SalaryCalcService } from './salary-calc.service';
import type {
  SalaryCalcRequest,
  SalaryCalcResult,
  SalaryCalcHistoryResponse,
} from '@shared/api.interface';

@Controller('api/salary-calc')
export class SalaryCalcController {
  constructor(private readonly salaryCalcService: SalaryCalcService) {}

  @Post('calculate')
  calculate(
    @Body() dto: SalaryCalcRequest,
    @Req() req: Request,
  ): SalaryCalcResult {
    const userId: string | null = req.userContext?.userId ?? null;
    return this.salaryCalcService.calculate(dto, userId);
  }

  @NeedLogin()
  @Get('records')
  async getRecords(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ): Promise<SalaryCalcHistoryResponse> {
    const { userId } = req.userContext;
    const pageNum: number = parseInt(page, 10) || 1;
    const pageSizeNum: number = parseInt(pageSize, 10) || 10;
    return this.salaryCalcService.getRecords(userId, pageNum, pageSizeNum);
  }

  @NeedLogin()
  @Delete('records/:id')
  async deleteRecord(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    await this.salaryCalcService.deleteRecord(userId, id);
    return { success: true };
  }

  @Get('cities')
  getCities(): { city: string; socialBase: number; fundBase: number; fundRatio: number }[] {
    return this.salaryCalcService.getCities();
  }
}
