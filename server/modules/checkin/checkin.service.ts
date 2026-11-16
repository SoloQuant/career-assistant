import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count, gte, lt } from 'drizzle-orm';
import { studyCheckin } from '@server/database/schema';
import type {
  StudyCheckin,
  CreateCheckinRequest,
  UpdateCheckinRequest,
  CheckinStats,
  CheckinCalendarResponse,
  CheckinListResponse,
} from '@shared/api.interface';

const MOOD_VALUES = ['great', 'good', 'normal', 'tired', 'bad'] as const;
type MoodType = (typeof MOOD_VALUES)[number];

function getShanghaiDate(date: Date = new Date()): Date {
  // Convert to Asia/Shanghai date components
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);
  const day = Number(parts.find(p => p.type === 'day')?.value);
  return new Date(year, month - 1, day);
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function diffDays(a: Date, b: Date): number {
  // a - b in days (both date-only at 00:00)
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / msPerDay);
}

function validateMood(mood: string): MoodType {
  if (!MOOD_VALUES.includes(mood as MoodType)) {
    throw new BadRequestException(`无效的心情值: ${mood}`);
  }
  return mood as MoodType;
}

function mapRowToCheckin(row: {
  id: string;
  checkinDate: string;
  durationMinutes: number;
  content: string;
  relatedSkills: string[];
  mood: string;
  createdAt: Date;
}): StudyCheckin {
  return {
    id: row.id,
    checkinDate: row.checkinDate,
    durationMinutes: row.durationMinutes,
    content: row.content,
    relatedSkills: row.relatedSkills,
    mood: row.mood as MoodType,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /**
   * 今日打卡（upsert by user + date）
   */
  async upsertToday(userId: string, dto: CreateCheckinRequest): Promise<StudyCheckin> {
    try {
      if (dto.mood !== undefined) {
        validateMood(dto.mood);
      }
      if (dto.durationMinutes < 0) {
        throw new BadRequestException('学习时长不能为负数');
      }

      // 先查找当天是否已打卡
      const existing = await this.db
        .select({
          id: studyCheckin.id,
          checkinDate: studyCheckin.checkinDate,
          durationMinutes: studyCheckin.durationMinutes,
          content: studyCheckin.content,
          relatedSkills: studyCheckin.relatedSkills,
          mood: studyCheckin.mood,
          createdAt: studyCheckin.createdAt,
        })
        .from(studyCheckin)
        .where(
          and(
            eq(studyCheckin.createdBy, userId),
            eq(studyCheckin.checkinDate, dto.checkinDate),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // 更新已有记录
        const patch: Partial<typeof studyCheckin.$inferInsert> = {
          durationMinutes: dto.durationMinutes,
          content: dto.content,
        };
        if (dto.relatedSkills !== undefined) {
          patch.relatedSkills = dto.relatedSkills;
        }
        if (dto.mood !== undefined) {
          patch.mood = dto.mood;
        }

        const updated = await this.db
          .update(studyCheckin)
          .set(patch)
          .where(eq(studyCheckin.id, existing[0].id))
          .returning({
            id: studyCheckin.id,
            checkinDate: studyCheckin.checkinDate,
            durationMinutes: studyCheckin.durationMinutes,
            content: studyCheckin.content,
            relatedSkills: studyCheckin.relatedSkills,
            mood: studyCheckin.mood,
            createdAt: studyCheckin.createdAt,
          });

        return mapRowToCheckin(updated[0]);
      }

      // 新建打卡记录
      const inserted = await this.db
        .insert(studyCheckin)
        .values({
          checkinDate: dto.checkinDate,
          durationMinutes: dto.durationMinutes,
          content: dto.content,
          relatedSkills: dto.relatedSkills ?? [],
          mood: dto.mood ?? 'good',
        })
        .returning({
          id: studyCheckin.id,
          checkinDate: studyCheckin.checkinDate,
          durationMinutes: studyCheckin.durationMinutes,
          content: studyCheckin.content,
          relatedSkills: studyCheckin.relatedSkills,
          mood: studyCheckin.mood,
          createdAt: studyCheckin.createdAt,
        });

      return mapRowToCheckin(inserted[0]);
    } catch (error) {
      this.logger.error(
        `打卡失败 userId=${userId} date=${dto.checkinDate}`,
        error as Error,
      );
      throw error;
    }
  }

  /**
   * 获取今日打卡状态
   */
  async getToday(userId: string): Promise<StudyCheckin | null> {
    try {
      const today = formatDateStr(getShanghaiDate());
      const rows = await this.db
        .select({
          id: studyCheckin.id,
          checkinDate: studyCheckin.checkinDate,
          durationMinutes: studyCheckin.durationMinutes,
          content: studyCheckin.content,
          relatedSkills: studyCheckin.relatedSkills,
          mood: studyCheckin.mood,
          createdAt: studyCheckin.createdAt,
        })
        .from(studyCheckin)
        .where(
          and(
            eq(studyCheckin.createdBy, userId),
            eq(studyCheckin.checkinDate, today),
          ),
        )
        .limit(1);

      if (rows.length === 0) return null;
      return mapRowToCheckin(rows[0]);
    } catch (error) {
      this.logger.error(`获取今日打卡失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  /**
   * 打卡统计
   */
  async getStats(userId: string): Promise<CheckinStats> {
    try {
      // 拉取所有打卡日期和时长（按日期排序）
      const allRecords = await this.db
        .select({
          checkinDate: studyCheckin.checkinDate,
          durationMinutes: studyCheckin.durationMinutes,
        })
        .from(studyCheckin)
        .where(eq(studyCheckin.createdBy, userId))
        .orderBy(desc(studyCheckin.checkinDate));

      const totalDays = allRecords.length;
      const totalMinutes = allRecords.reduce(
        (sum: number, r) => sum + r.durationMinutes,
        0,
      );

      // 计算 currentStreak 和 longestStreak
      const today = getShanghaiDate();
      const todayStr = formatDateStr(today);

      // 将日期字符串转为 Date 对象（用于连续计算）
      const dateSet = new Set<string>();
      const dateList: Date[] = [];
      for (const r of allRecords) {
        dateSet.add(r.checkinDate);
        const [y, m, d] = r.checkinDate.split('-').map(Number);
        dateList.push(new Date(y, m - 1, d));
      }

      // currentStreak：从今天或昨天开始往前数
      let currentStreak = 0;
      let cursor = today;
      const todayCheckedIn = dateSet.has(todayStr);

      if (!todayCheckedIn) {
        // 今天没打，从昨天开始
        cursor = addDays(today, -1);
        if (!dateSet.has(formatDateStr(cursor))) {
          currentStreak = 0;
        }
      }

      if (todayCheckedIn || dateSet.has(formatDateStr(addDays(today, -1)))) {
        while (dateSet.has(formatDateStr(cursor))) {
          currentStreak += 1;
          cursor = addDays(cursor, -1);
        }
      }

      // longestStreak：排序后找最长连续区间
      let longestStreak = 0;
      if (dateList.length > 0) {
        // 升序排序
        const sorted = [...dateList].sort((a, b) => a.getTime() - b.getTime());
        let currentRun = 1;
        let maxRun = 1;
        for (let i = 1; i < sorted.length; i++) {
          if (diffDays(sorted[i], sorted[i - 1]) === 1) {
            currentRun += 1;
          } else if (diffDays(sorted[i], sorted[i - 1]) > 1) {
            maxRun = Math.max(maxRun, currentRun);
            currentRun = 1;
          }
          // 同一天（理论上不会有，但防御）
        }
        longestStreak = Math.max(maxRun, currentRun);
      }

      // 本月统计
      const now = getShanghaiDate();
      const year = now.getFullYear();
      const month = now.getMonth();
      const monthStart = formatDateStr(new Date(year, month, 1));
      const monthEnd = formatDateStr(new Date(year, month + 1, 1));

      const monthRecords = allRecords.filter(
        r => r.checkinDate >= monthStart && r.checkinDate < monthEnd,
      );
      const thisMonthDays = monthRecords.length;
      const thisMonthMinutes = monthRecords.reduce(
        (sum: number, r) => sum + r.durationMinutes,
        0,
      );

      return {
        totalDays,
        currentStreak,
        longestStreak,
        totalMinutes,
        thisMonthDays,
        thisMonthMinutes,
      };
    } catch (error) {
      this.logger.error(`获取打卡统计失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  /**
   * 打卡日历
   */
  async getCalendar(
    userId: string,
    year: number,
    month: number,
  ): Promise<CheckinCalendarResponse> {
    try {
      // month: 1-12
      const monthStart = formatDateStr(new Date(year, month - 1, 1));
      const monthEnd = formatDateStr(new Date(year, month, 1));

      const records = await this.db
        .select({
          checkinDate: studyCheckin.checkinDate,
          durationMinutes: studyCheckin.durationMinutes,
        })
        .from(studyCheckin)
        .where(
          and(
            eq(studyCheckin.createdBy, userId),
            gte(studyCheckin.checkinDate, monthStart),
            lt(studyCheckin.checkinDate, monthEnd),
          ),
        );

      const recordMap = new Map<string, number>();
      for (const r of records) {
        recordMap.set(r.checkinDate, r.durationMinutes);
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      const days: { date: string; checkedIn: boolean; durationMinutes: number }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = formatDateStr(new Date(year, month - 1, d));
        const duration = recordMap.get(dateStr) ?? 0;
        days.push({
          date: dateStr,
          checkedIn: duration > 0,
          durationMinutes: duration,
        });
      }

      return { year, month, days };
    } catch (error) {
      this.logger.error(
        `获取打卡日历失败 userId=${userId} year=${year} month=${month}`,
        error as Error,
      );
      throw error;
    }
  }

  /**
   * 打卡记录列表（分页）
   */
  async getList(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<CheckinListResponse> {
    try {
      const offset = (page - 1) * pageSize;

      const [itemsResult, countResult] = await Promise.all([
        this.db
          .select({
            id: studyCheckin.id,
            checkinDate: studyCheckin.checkinDate,
            durationMinutes: studyCheckin.durationMinutes,
            content: studyCheckin.content,
            relatedSkills: studyCheckin.relatedSkills,
            mood: studyCheckin.mood,
            createdAt: studyCheckin.createdAt,
          })
          .from(studyCheckin)
          .where(eq(studyCheckin.createdBy, userId))
          .orderBy(desc(studyCheckin.checkinDate))
          .limit(pageSize)
          .offset(offset),
        this.db
          .select({ count: count() })
          .from(studyCheckin)
          .where(eq(studyCheckin.createdBy, userId)),
      ]);

      const items: StudyCheckin[] = itemsResult.map(mapRowToCheckin);
      const total = Number(countResult[0]?.count ?? 0);

      return { items, total };
    } catch (error) {
      this.logger.error(
        `获取打卡列表失败 userId=${userId} page=${page}`,
        error as Error,
      );
      throw error;
    }
  }

  /**
   * 更新打卡记录
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateCheckinRequest,
  ): Promise<StudyCheckin> {
    try {
      if (dto.mood !== undefined) {
        validateMood(dto.mood);
      }

      // 先查记录是否存在且属于当前用户
      const existing = await this.db
        .select({
          id: studyCheckin.id,
          createdBy: studyCheckin.createdBy,
        })
        .from(studyCheckin)
        .where(eq(studyCheckin.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('打卡记录不存在');
      }
      if (existing[0].createdBy !== userId) {
        throw new ForbiddenException('无权修改该打卡记录');
      }

      const patch: Partial<typeof studyCheckin.$inferInsert> = {};
      if (dto.durationMinutes !== undefined) {
        if (dto.durationMinutes < 0) {
          throw new BadRequestException('学习时长不能为负数');
        }
        patch.durationMinutes = dto.durationMinutes;
      }
      if (dto.content !== undefined) patch.content = dto.content;
      if (dto.relatedSkills !== undefined) {
        patch.relatedSkills = dto.relatedSkills;
      }
      if (dto.mood !== undefined) patch.mood = dto.mood;

      if (Object.keys(patch).length === 0) {
        throw new BadRequestException('未提供可更新字段');
      }

      const updated = await this.db
        .update(studyCheckin)
        .set(patch)
        .where(eq(studyCheckin.id, id))
        .returning({
          id: studyCheckin.id,
          checkinDate: studyCheckin.checkinDate,
          durationMinutes: studyCheckin.durationMinutes,
          content: studyCheckin.content,
          relatedSkills: studyCheckin.relatedSkills,
          mood: studyCheckin.mood,
          createdAt: studyCheckin.createdAt,
        });

      if (updated.length === 0) {
        throw new NotFoundException('打卡记录不存在');
      }

      return mapRowToCheckin(updated[0]);
    } catch (error) {
      this.logger.error(`更新打卡记录失败 id=${id}`, error as Error);
      throw error;
    }
  }

  /**
   * 删除打卡记录
   */
  async remove(userId: string, id: string): Promise<void> {
    try {
      // 先查记录是否存在且属于当前用户
      const existing = await this.db
        .select({
          id: studyCheckin.id,
          createdBy: studyCheckin.createdBy,
        })
        .from(studyCheckin)
        .where(eq(studyCheckin.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('打卡记录不存在');
      }
      if (existing[0].createdBy !== userId) {
        throw new ForbiddenException('无权删除该打卡记录');
      }

      const deleted = await this.db
        .delete(studyCheckin)
        .where(eq(studyCheckin.id, id))
        .returning({ id: studyCheckin.id });

      if (deleted.length === 0) {
        throw new NotFoundException('打卡记录不存在');
      }
    } catch (error) {
      this.logger.error(`删除打卡记录失败 id=${id}`, error as Error);
      throw error;
    }
  }
}
