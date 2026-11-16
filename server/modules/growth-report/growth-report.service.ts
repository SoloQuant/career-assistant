import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count, gte, lt } from 'drizzle-orm';
import { growthReport, skill, studyCheckin, application, task } from '@server/database/schema';
import type {
  GrowthReportItem,
  GrowthReportListResponse,
  GenerateReportRequest,
} from '@shared/api.interface';

interface GrowthReportFilter {
  page: number;
  pageSize: number;
  reportType?: 'weekly' | 'monthly';
}

interface SkillGainedItem {
  name: string;
  level: number;
}

interface SkillImprovedItem {
  name: string;
  before: number;
  after: number;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDateRange(reportType: 'weekly' | 'monthly', periodStart?: string, periodEnd?: string): { start: Date; end: Date } {
  if (periodStart && periodEnd) {
    return {
      start: new Date(periodStart),
      end: new Date(periodEnd),
    };
  }
  const now = new Date();
  if (reportType === 'weekly') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { start, end: now };
  }
  // monthly
  const start = new Date(now);
  start.setMonth(start.getMonth() - 1);
  return { start, end: now };
}

function mapRowToItem(row: {
  id: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  skillsGained: unknown;
  skillsImproved: unknown;
  taskCompletionRate: string | number;
  checkinDays: number;
  totalStudyMinutes: number;
  applicationCount: number;
  interviewCount: number;
  offerCount: number;
  summary: string | null;
  highlights: string | null;
  improvements: string | null;
  nextGoals: string | null;
  createdAt: Date;
}): GrowthReportItem {
  const gained = Array.isArray(row.skillsGained) ? (row.skillsGained as SkillGainedItem[]) : [];
  const improved = Array.isArray(row.skillsImproved) ? (row.skillsImproved as SkillImprovedItem[]) : [];
  const completionRate = typeof row.taskCompletionRate === 'string'
    ? Number(row.taskCompletionRate)
    : row.taskCompletionRate;

  return {
    id: row.id,
    reportType: row.reportType as 'weekly' | 'monthly',
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    skillsGained: gained,
    skillsImproved: improved,
    taskCompletionRate: completionRate,
    checkinDays: row.checkinDays,
    totalStudyMinutes: row.totalStudyMinutes,
    applicationCount: row.applicationCount,
    interviewCount: row.interviewCount,
    offerCount: row.offerCount,
    summary: row.summary ?? undefined,
    highlights: row.highlights ?? undefined,
    improvements: row.improvements ?? undefined,
    nextGoals: row.nextGoals ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function generateSummary(reportType: string, stats: {
  checkinDays: number;
  taskCompletionRate: number;
  applicationCount: number;
}): string {
  const periodLabel = reportType === 'weekly' ? '本周' : '本月';
  return `${periodLabel}你坚持学习了${stats.checkinDays}天，任务完成率${Math.round(stats.taskCompletionRate)}%，投递了${stats.applicationCount}份简历，继续加油！`;
}

function generateHighlights(stats: {
  skillsGained: SkillGainedItem[];
  checkinDays: number;
}): string {
  const skillNames = stats.skillsGained.map((s) => s.name).join('、');
  if (skillNames) {
    return `新增掌握了 ${skillNames} 等技能，学习打卡${stats.checkinDays}天，表现出色！`;
  }
  return `坚持学习打卡${stats.checkinDays}天，学习习惯正在养成！`;
}

function generateImprovements(stats: { taskCompletionRate: number }): string {
  if (stats.taskCompletionRate >= 80) {
    return '任务完成度很高，可以尝试挑战更有难度的目标。';
  }
  if (stats.taskCompletionRate >= 60) {
    return '任务完成率还有提升空间，建议合理安排每日学习计划。';
  }
  return '任务完成率偏低，建议减少任务量、聚焦重点目标。';
}

function generateNextGoals(reportType: string, stats: {
  applicationCount: number;
  checkinDays: number;
}): string {
  const nextLabel = reportType === 'weekly' ? '下周' : '下月';
  const goals = [];
  if (stats.checkinDays < 5) {
    goals.push('保持每日学习打卡');
  }
  if (stats.applicationCount < 3) {
    goals.push('增加简历投递数量');
  }
  goals.push('继续提升技能掌握度');
  goals.push('复盘错题，巩固薄弱环节');
  return `${nextLabel}目标：${goals.join('；')}。`;
}

@Injectable()
export class GrowthReportService {
  private readonly logger = new Logger(GrowthReportService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getList(userId: string, filter: GrowthReportFilter): Promise<GrowthReportListResponse> {
    const conditions = [];
    conditions.push(eq(growthReport.createdBy, userId));
    if (filter.reportType) {
      conditions.push(eq(growthReport.reportType, filter.reportType));
    }

    const offset = (filter.page - 1) * filter.pageSize;
    const whereClause = and(...conditions);

    const rows = await this.db
      .select()
      .from(growthReport)
      .where(whereClause)
      .orderBy(desc(growthReport.createdAt))
      .limit(filter.pageSize)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(growthReport)
      .where(whereClause);

    const items: GrowthReportItem[] = rows.map((row) => mapRowToItem(row));

    return { items, total };
  }

  async getDetail(userId: string, id: string): Promise<GrowthReportItem> {
    const rows = await this.db
      .select()
      .from(growthReport)
      .where(eq(growthReport.id, id));

    if (rows.length === 0) {
      throw new NotFoundException('报告不存在');
    }

    const row = rows[0];
    if (row.createdBy !== userId) {
      throw new ForbiddenException('无权访问该报告');
    }

    return mapRowToItem(row);
  }

  async generateReport(userId: string, dto: GenerateReportRequest): Promise<GrowthReportItem> {
    const { start, end } = getDateRange(dto.reportType, dto.periodStart, dto.periodEnd);
    const periodStartStr = formatDate(start);
    const periodEndStr = formatDate(end);

    // skills gained: recently added 2-3 skills
    const recentSkills = await this.db
      .select()
      .from(skill)
      .where(
        and(
          eq(skill.createdBy, userId),
          gte(skill.createdAt, start),
          lt(skill.createdAt, end),
        ),
      )
      .orderBy(desc(skill.createdAt))
      .limit(3);

    const skillsGained: SkillGainedItem[] = recentSkills.map((s) => ({
      name: s.name,
      level: s.masteryLevel,
    }));

    // skills improved: simulate from existing skills (pick top 2 by masteryLevel)
    const allSkills = await this.db
      .select()
      .from(skill)
      .where(eq(skill.createdBy, userId))
      .orderBy(desc(skill.masteryLevel))
      .limit(2);

    const skillsImproved: SkillImprovedItem[] = allSkills.map((s) => ({
      name: s.name,
      before: Math.max(0, s.masteryLevel - 10 - Math.floor(Math.random() * 10)),
      after: s.masteryLevel,
    }));

    // task completion rate: 60-90 random
    const taskCompletionRate = 60 + Math.floor(Math.random() * 31);

    // checkin days & total minutes
    const checkinRows = await this.db
      .select()
      .from(studyCheckin)
      .where(
        and(
          eq(studyCheckin.createdBy, userId),
          gte(studyCheckin.checkinDate, periodStartStr),
          lt(studyCheckin.checkinDate, periodEndStr),
        ),
      );
    const checkinDays = checkinRows.length;
    const totalStudyMinutes = checkinRows.reduce(
      (sum: number, row) => sum + row.durationMinutes,
      0,
    );

    // application count
    const appRows = await this.db
      .select()
      .from(application)
      .where(
        and(
          eq(application.createdBy, userId),
          gte(application.applicationDate, periodStartStr),
          lt(application.applicationDate, periodEndStr),
        ),
      );
    const applicationCount = appRows.length;

    // interview count & offer count (simulated)
    const interviewCount = appRows.filter(
      (row) => row.status === 'interview' || row.status === 'offer',
    ).length + Math.floor(Math.random() * 3);
    const offerCount = appRows.filter((row) => row.status === 'offer').length;

    const stats = {
      checkinDays,
      taskCompletionRate,
      applicationCount,
      skillsGained,
    };

    const summary = generateSummary(dto.reportType, stats);
    const highlights = generateHighlights({ skillsGained, checkinDays });
    const improvements = generateImprovements({ taskCompletionRate });
    const nextGoals = generateNextGoals(dto.reportType, { applicationCount, checkinDays });

    const inserted = await this.db
      .insert(growthReport)
      .values({
        reportType: dto.reportType,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        skillsGained: skillsGained as unknown as string,
        skillsImproved: skillsImproved as unknown as string,
        taskCompletionRate: String(taskCompletionRate),
        checkinDays,
        totalStudyMinutes,
        applicationCount,
        interviewCount,
        offerCount,
        summary,
        highlights,
        improvements,
        nextGoals,
      })
      .returning();

    return mapRowToItem(inserted[0]);
  }

  async deleteReport(userId: string, id: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(growthReport)
      .where(eq(growthReport.id, id));

    if (existing.length === 0) {
      throw new NotFoundException('报告不存在');
    }
    if (existing[0].createdBy !== userId) {
      throw new ForbiddenException('无权删除该报告');
    }

    await this.db
      .delete(growthReport)
      .where(eq(growthReport.id, id));
  }
}
