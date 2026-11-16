import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, gte, lt, desc, asc } from 'drizzle-orm';
import { calendarEvent } from '@server/database/schema';
import type {
  CalendarEventItem,
  CreateCalendarEventRequest,
} from '@shared/api.interface';

type CalendarEventSelect = typeof calendarEvent.$inferSelect;
type CalendarEventInsert = typeof calendarEvent.$inferInsert;

@Injectable()
export class CalendarService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getEventsByRange(
    userId: string,
    startDate: string,
    endDate: string,
    eventType?: string,
  ): Promise<{ items: CalendarEventItem[] }> {
    const conditions = [
      eq(calendarEvent.createdBy, userId),
      gte(calendarEvent.eventDate, startDate),
      lt(calendarEvent.eventDate, endDate),
    ];
    if (eventType) {
      conditions.push(eq(calendarEvent.eventType, eventType));
    }

    const records: CalendarEventSelect[] = await this.db
      .select()
      .from(calendarEvent)
      .where(and(...conditions))
      .orderBy(asc(calendarEvent.eventDate), asc(calendarEvent.startTime));

    return { items: records.map((r: CalendarEventSelect) => this.mapToItem(r)) };
  }

  async getEventsByMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<{ items: CalendarEventItem[] }> {
    if (month < 1 || month > 12) {
      throw new BadRequestException('月份必须在1-12之间');
    }
    const start: string = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth: number = month === 12 ? 1 : month + 1;
    const nextYear: number = month === 12 ? year + 1 : year;
    const end: string = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    return this.getEventsByRange(userId, start, end);
  }

  async getUpcoming(userId: string): Promise<{ items: CalendarEventItem[] }> {
    const now: Date = new Date();
    const start: string = now.toISOString().split('T')[0];
    const endDate: Date = new Date(now);
    endDate.setDate(endDate.getDate() + 7);
    const end: string = endDate.toISOString().split('T')[0];
    return this.getEventsByRange(userId, start, end);
  }

  async getEventById(userId: string, id: string): Promise<CalendarEventItem> {
    const records: CalendarEventSelect[] = await this.db
      .select()
      .from(calendarEvent)
      .where(eq(calendarEvent.id, id))
      .limit(1);

    if (records.length === 0) {
      throw new NotFoundException('事件不存在');
    }

    const record: CalendarEventSelect = records[0];
    if (record.createdBy !== userId) {
      throw new ForbiddenException('无权访问该事件');
    }

    return this.mapToItem(record);
  }

  async createEvent(
    userId: string,
    dto: CreateCalendarEventRequest,
  ): Promise<CalendarEventItem> {
    const insertData: CalendarEventInsert = {
      title: dto.title,
      description: dto.description ?? null,
      eventType: dto.eventType ?? 'general',
      eventDate: dto.eventDate,
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
      location: dto.location ?? null,
      relatedTaskId: dto.relatedTaskId ?? null,
      relatedCompany: dto.relatedCompany ?? null,
      priority: dto.priority ?? 'medium',
      isAllDay: dto.isAllDay ?? false,
      reminderMinutesBefore: dto.reminderMinutesBefore ?? null,
      isReminderSent: false,
      color: dto.color ?? null,
      status: 'pending',
      createdBy: userId,
      updatedBy: userId,
    };

    const result: CalendarEventSelect[] = await this.db
      .insert(calendarEvent)
      .values(insertData)
      .returning();

    return this.mapToItem(result[0]);
  }

  async updateEvent(
    userId: string,
    id: string,
    dto: Partial<CreateCalendarEventRequest>,
  ): Promise<CalendarEventItem> {
    const existing: CalendarEventSelect[] = await this.db
      .select()
      .from(calendarEvent)
      .where(eq(calendarEvent.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('事件不存在');
    }

    if (existing[0].createdBy !== userId) {
      throw new ForbiddenException('无权修改该事件');
    }

    const patch: Partial<CalendarEventInsert> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.eventType !== undefined) patch.eventType = dto.eventType;
    if (dto.eventDate !== undefined) patch.eventDate = dto.eventDate;
    if (dto.startTime !== undefined) patch.startTime = dto.startTime;
    if (dto.endTime !== undefined) patch.endTime = dto.endTime;
    if (dto.location !== undefined) patch.location = dto.location;
    if (dto.relatedTaskId !== undefined) patch.relatedTaskId = dto.relatedTaskId;
    if (dto.relatedCompany !== undefined) patch.relatedCompany = dto.relatedCompany;
    if (dto.priority !== undefined) patch.priority = dto.priority;
    if (dto.isAllDay !== undefined) patch.isAllDay = dto.isAllDay;
    if (dto.reminderMinutesBefore !== undefined) {
      patch.reminderMinutesBefore = dto.reminderMinutesBefore;
    }
    if (dto.color !== undefined) patch.color = dto.color;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    patch.updatedBy = userId;

    const updated: CalendarEventSelect[] = await this.db
      .update(calendarEvent)
      .set(patch)
      .where(eq(calendarEvent.id, id))
      .returning();

    return this.mapToItem(updated[0]);
  }

  async deleteEvent(userId: string, id: string): Promise<void> {
    const existing = await this.db
      .select({ id: calendarEvent.id, createdBy: calendarEvent.createdBy })
      .from(calendarEvent)
      .where(eq(calendarEvent.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('事件不存在');
    }

    if (existing[0].createdBy !== userId) {
      throw new ForbiddenException('无权删除该事件');
    }

    await this.db.delete(calendarEvent).where(eq(calendarEvent.id, id));
  }

  private mapToItem(record: CalendarEventSelect): CalendarEventItem {
    const eventDateStr: string =
      typeof record.eventDate === 'string'
        ? record.eventDate
        : (record.eventDate as Date).toISOString().split('T')[0];

    return {
      id: record.id,
      title: record.title,
      description: record.description ?? undefined,
      eventType: record.eventType,
      eventDate: eventDateStr,
      startTime: record.startTime ?? undefined,
      endTime: record.endTime ?? undefined,
      location: record.location ?? undefined,
      relatedTaskId: record.relatedTaskId ?? undefined,
      relatedCompany: record.relatedCompany ?? undefined,
      priority: record.priority as 'low' | 'medium' | 'high',
      isAllDay: record.isAllDay,
      reminderMinutesBefore: record.reminderMinutesBefore ?? undefined,
      isReminderSent: record.isReminderSent,
      color: record.color ?? undefined,
      status: record.status as 'pending' | 'completed' | 'cancelled',
      createdAt: record.createdAt.toISOString(),
    };
  }
}
