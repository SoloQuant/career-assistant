import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { CalendarService } from './calendar.service';
import type {
  CalendarEventItem,
  CreateCalendarEventRequest,
} from '@shared/api.interface';

@NeedLogin()
@Controller('api/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  async getEvents(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('eventType') eventType?: string,
  ): Promise<{ items: CalendarEventItem[] }> {
    const { userId } = req.userContext;
    return this.calendarService.getEventsByRange(userId, startDate, endDate, eventType);
  }

  @Get('month')
  async getMonthEvents(
    @Req() req: Request,
    @Query('year') year: string,
    @Query('month') month: string,
  ): Promise<{ items: CalendarEventItem[] }> {
    const { userId } = req.userContext;
    const yearNum: number = parseInt(year, 10);
    const monthNum: number = parseInt(month, 10);
    return this.calendarService.getEventsByMonth(userId, yearNum, monthNum);
  }

  @Get('upcoming')
  async getUpcoming(@Req() req: Request): Promise<{ items: CalendarEventItem[] }> {
    const { userId } = req.userContext;
    return this.calendarService.getUpcoming(userId);
  }

  @Get(':id')
  async getEvent(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<CalendarEventItem> {
    const { userId } = req.userContext;
    return this.calendarService.getEventById(userId, id);
  }

  @Post()
  async createEvent(
    @Req() req: Request,
    @Body() dto: CreateCalendarEventRequest,
  ): Promise<CalendarEventItem> {
    const { userId } = req.userContext;
    return this.calendarService.createEvent(userId, dto);
  }

  @Patch(':id')
  async updateEvent(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCalendarEventRequest>,
  ): Promise<CalendarEventItem> {
    const { userId } = req.userContext;
    return this.calendarService.updateEvent(userId, id, dto);
  }

  @Delete(':id')
  async deleteEvent(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    await this.calendarService.deleteEvent(userId, id);
    return { success: true };
  }
}
