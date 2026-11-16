import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { count, eq, sql, desc, asc } from 'drizzle-orm';
import {
  skill,
  task,
  application,
  skillAssessmentHistory,
} from '@server/database/schema';
import type {
  RadarChartData,
  SkillGrowthDataPoint,
  ApplicationStats,
  TaskStats,
  JobItem,
} from '@shared/api.interface';
import { SKILL_CATEGORIES } from '@shared/api.interface';
import { JobService } from '../job/job.service';

interface OverviewStats {
  skillsCount: number;
  tasksCount: number;
  applicationsCount: number;
  taskCompletionRate: number;
  applicationStatusDistribution: ApplicationStats;
}

interface SkillDistributionItem {
  name: string;
  value: number;
  category: string;
}

interface JobMatchDistribution {
  range: string;
  count: number;
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);
  private readonly DEFAULT_USER_ID = 'default_user';

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly jobService: JobService,
  ) {}

  private toNumber(val: unknown): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    return 0;
  }

  async getOverview(): Promise<OverviewStats> {
    try {
      const [
        skillsResult,
        tasksResult,
        completedTasksResult,
        inProgressResult,
        pendingResult,
        appsResult,
        statusResult,
      ] = await Promise.all([
        this.db.select({ value: count() }).from(skill),
        this.db.select({ value: count() }).from(task),
        this.db.select({ value: count() }).from(task).where(eq(task.status, 'completed')),
        this.db.select({ value: count() }).from(task).where(eq(task.status, 'in_progress')),
        this.db.select({ value: count() }).from(task).where(eq(task.status, 'pending')),
        this.db.select({ value: count() }).from(application),
        this.db
          .select({
            status: application.status,
            value: count(),
          })
          .from(application)
          .groupBy(application.status),
      ]);

      const skillsCount = this.toNumber(skillsResult[0]?.value);
      const tasksCount = this.toNumber(tasksResult[0]?.value);
      const completedCount = this.toNumber(completedTasksResult[0]?.value);
      const applicationsCount = this.toNumber(appsResult[0]?.value);
      const taskCompletionRate = tasksCount > 0
        ? Math.round((completedCount / tasksCount) * 100) / 100
        : 0;

      const distribution: ApplicationStats = {
        submitted: 0,
        writtenTest: 0,
        interview: 0,
        offer: 0,
        rejection: 0,
      };
      for (const row of statusResult) {
        const key = row.status as keyof ApplicationStats;
        if (key in distribution) {
          distribution[key] = this.toNumber(row.value);
        }
      }

      return {
        skillsCount,
        tasksCount,
        applicationsCount,
        taskCompletionRate,
        applicationStatusDistribution: distribution,
      };
    } catch (error) {
      this.logger.error('获取总览统计失败', error as Error);
      throw error;
    }
  }

  async getRadarData(): Promise<RadarChartData[]> {
    try {
      const rows = await this.db
        .select({
          category: skill.category,
          avgMastery: sql<number>`round(avg(${skill.masteryLevel}))`,
        })
        .from(skill)
        .groupBy(skill.category);

      const labelMap = new Map<string, string>(
        SKILL_CATEGORIES.map((c) => [c.key, c.label]),
      );

      const result: RadarChartData[] = rows.map((row) => ({
        category: labelMap.get(row.category) ?? row.category,
        value: this.toNumber(row.avgMastery),
      }));

      return result;
    } catch (error) {
      this.logger.error('获取雷达图数据失败', error as Error);
      throw error;
    }
  }

  async getSkillDistribution(): Promise<SkillDistributionItem[]> {
    try {
      const rows = await this.db
        .select({
          name: skill.name,
          value: skill.masteryLevel,
          category: skill.category,
        })
        .from(skill)
        .orderBy(desc(skill.masteryLevel));

      const labelMap = new Map<string, string>(
        SKILL_CATEGORIES.map((c) => [c.key, c.label]),
      );

      return rows.map((row) => ({
        name: row.name,
        value: row.value,
        category: labelMap.get(row.category) ?? row.category,
      }));
    } catch (error) {
      this.logger.error('获取技能分布数据失败', error as Error);
      throw error;
    }
  }

  async getGrowthCurve(): Promise<SkillGrowthDataPoint[]> {
    try {
      const rows = await this.db
        .select({
          date: skillAssessmentHistory.assessmentDate,
          totalMastery: sql<number>`sum(${skillAssessmentHistory.masteryLevel})`,
          skillsCount: sql<number>`count(distinct ${skillAssessmentHistory.skillId})`,
        })
        .from(skillAssessmentHistory)
        .groupBy(skillAssessmentHistory.assessmentDate)
        .orderBy(asc(skillAssessmentHistory.assessmentDate));

      return rows.map((row) => ({
        date: String(row.date),
        totalMastery: this.toNumber(row.totalMastery),
        skillsCount: this.toNumber(row.skillsCount),
      }));
    } catch (error) {
      this.logger.error('获取增长曲线数据失败', error as Error);
      throw error;
    }
  }

  async getJobMatchDistribution(): Promise<JobMatchDistribution[]> {
    try {
      const recommendedJobs: JobItem[] = await this.jobService.getRecommendedJobs();

      const ranges = [
        { range: '90-100', min: 90, max: 101, count: 0 },
        { range: '80-89', min: 80, max: 90, count: 0 },
        { range: '70-79', min: 70, max: 80, count: 0 },
        { range: '60-69', min: 60, max: 70, count: 0 },
        { range: '0-59', min: 0, max: 60, count: 0 },
      ];

      for (const j of recommendedJobs) {
        const score = j.matchScore ?? 0;
        for (const r of ranges) {
          if (score >= r.min && score < r.max) {
            r.count += 1;
            break;
          }
        }
      }

      return ranges.map(({ range, count }) => ({ range, count }));
    } catch (error) {
      this.logger.error('获取岗位匹配分布失败', error as Error);
      throw error;
    }
  }

  async getTaskStats(): Promise<TaskStats> {
    try {
      const [totalResult, completedResult, inProgressResult, pendingResult] =
        await Promise.all([
          this.db.select({ value: count() }).from(task),
          this.db.select({ value: count() }).from(task).where(eq(task.status, 'completed')),
          this.db.select({ value: count() }).from(task).where(eq(task.status, 'in_progress')),
          this.db.select({ value: count() }).from(task).where(eq(task.status, 'pending')),
        ]);

      const total = this.toNumber(totalResult[0]?.value);
      const completed = this.toNumber(completedResult[0]?.value);
      const inProgress = this.toNumber(inProgressResult[0]?.value);
      const pending = this.toNumber(pendingResult[0]?.value);
      const completionRate = total > 0 ? Math.round((completed / total) * 100) / 100 : 0;

      return { total, completed, inProgress, pending, completionRate };
    } catch (error) {
      this.logger.error('获取任务统计失败', error as Error);
      throw error;
    }
  }

  async getApplicationStats(): Promise<ApplicationStats> {
    try {
      const rows = await this.db
        .select({
          status: application.status,
          value: count(),
        })
        .from(application)
        .groupBy(application.status);

      const result: ApplicationStats = {
        submitted: 0,
        writtenTest: 0,
        interview: 0,
        offer: 0,
        rejection: 0,
      };

      for (const row of rows) {
        const key = row.status as keyof ApplicationStats;
        if (key in result) {
          result[key] = this.toNumber(row.value);
        }
      }

      return result;
    } catch (error) {
      this.logger.error('获取求职进度分布失败', error as Error);
      throw error;
    }
  }
}
