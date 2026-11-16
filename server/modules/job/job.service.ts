import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { job, skill, profile } from '@server/database/schema';
import type { JobItem, JobFilterParams } from '@shared/api.interface';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private toJobItem(row: typeof job.$inferSelect): JobItem {
    return {
      id: row.id,
      title: row.title,
      company: row.company,
      city: row.city,
      salary: row.salary,
      salaryMin: row.salaryMin ?? undefined,
      salaryMax: row.salaryMax ?? undefined,
      requirements: row.requirements,
      description: row.description,
      requiredSkills: row.requiredSkills ?? [],
      jobType: row.jobType,
      source: row.source,
      applyUrl: row.applyUrl,
      publishDate: row.publishDate.toISOString(),
    };
  }

  async findAll(params: JobFilterParams): Promise<JobItem[]> {
    try {
      const conditions = [];
      if (params.city) conditions.push(eq(job.city, params.city));
      if (params.jobType) conditions.push(eq(job.jobType, params.jobType));
      if (params.source && params.source !== 'all') {
        conditions.push(eq(job.source, params.source));
      }
      if (params.salaryMin !== undefined) {
        conditions.push(gte(job.salaryMin, params.salaryMin));
      }
      if (params.salaryMax !== undefined) {
        conditions.push(lte(job.salaryMax, params.salaryMax));
      }

      const query = conditions.length > 0
        ? this.db.select().from(job).where(and(...conditions))
        : this.db.select().from(job);

      const rows = await query.orderBy(desc(job.publishDate)).limit(50);
      return rows.map((row) => this.toJobItem(row));
    } catch (error) {
      this.logger.error('获取岗位列表失败', error as Error);
      throw error;
    }
  }

  async findById(id: string): Promise<JobItem | null> {
    try {
      const rows = await this.db
        .select()
        .from(job)
        .where(eq(job.id, id))
        .limit(1);
      if (rows.length === 0) return null;
      return this.toJobItem(rows[0]);
    } catch (error) {
      this.logger.error(`获取岗位详情失败 id=${id}`, error as Error);
      throw error;
    }
  }

  private readonly CORE_SKILLS = new Set([
    'python', 'sql', 'hadoop', 'spark',
    '财务报表分析', '金融数据分析', '证券投资基础',
  ]);
  private readonly CORE_SKILL_WEIGHT = 2.0;
  private readonly DEFAULT_SKILL_WEIGHT = 1.0;
  private readonly DEFAULT_USER_ID = 'default_user';
  private readonly MATCH_REASON_THRESHOLD = 60;
  private readonly GAP_SKILL_THRESHOLD = 50;
  private readonly LOCATION_BONUS = 5;
  private readonly CAMPUS_BONUS = 3;

  private getSkillWeight(skillName: string): number {
    return this.CORE_SKILLS.has(skillName.toLowerCase())
      ? this.CORE_SKILL_WEIGHT
      : this.DEFAULT_SKILL_WEIGHT;
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
  }

  private findMatchingSkill(
    requiredSkill: string,
    userSkills: Array<{ name: string; masteryLevel: number }>,
  ): { name: string; masteryLevel: number } | null {
    const normalized = this.normalizeName(requiredSkill);
    // exact match first
    for (const s of userSkills) {
      if (this.normalizeName(s.name) === normalized) {
        return s;
      }
    }
    // fuzzy: contains or contained
    for (const s of userSkills) {
      const n = this.normalizeName(s.name);
      if (n.includes(normalized) || normalized.includes(n)) {
        return s;
      }
    }
    return null;
  }

  private computeJobMatch(
    jobRow: typeof job.$inferSelect,
    userSkills: Array<{ name: string; masteryLevel: number }>,
    userCity: string,
  ): { matchScore: number; matchReasons: string[]; gapSkills: string[] } {
    const requiredSkills: string[] = jobRow.requiredSkills ?? [];
    const matchReasons: string[] = [];
    const gapSkills: string[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    for (const reqSkill of requiredSkills) {
      const weight = this.getSkillWeight(reqSkill);
      totalWeight += weight;
      const matched = this.findMatchingSkill(reqSkill, userSkills);

      if (matched) {
        const masteryPct = matched.masteryLevel;
        totalScore += (masteryPct / 100) * weight;
        if (masteryPct >= this.MATCH_REASON_THRESHOLD) {
          matchReasons.push(`${reqSkill}（掌握度 ${masteryPct}%）`);
        }
        if (masteryPct < this.GAP_SKILL_THRESHOLD) {
          gapSkills.push(reqSkill);
        }
      } else {
        gapSkills.push(reqSkill);
      }
    }

    let matchScore = 0;
    if (totalWeight > 0) {
      matchScore = Math.round((totalScore / totalWeight) * 100);
    }

    // 地域加分
    if (userCity && jobRow.city && jobRow.city.includes(userCity)) {
      matchScore += this.LOCATION_BONUS;
    }

    // 校招/应届生加分
    if (jobRow.jobType === 'campus') {
      matchScore += this.CAMPUS_BONUS;
    }

    matchScore = Math.min(100, Math.max(0, matchScore));

    return { matchScore, matchReasons, gapSkills };
  }

  async getRecommendedJobs(filters?: JobFilterParams): Promise<JobItem[]> {
    try {
      const [userSkillsRows, profileRows] = await Promise.all([
        this.db
          .select({ name: skill.name, masteryLevel: skill.masteryLevel })
          .from(skill),
        this.db
          .select({ city: profile.city })
          .from(profile)
          .where(eq(profile.userId, this.DEFAULT_USER_ID))
          .limit(1),
      ]);

      const userCity = profileRows[0]?.city ?? '';

      const conditions = [];
      if (filters?.city) conditions.push(eq(job.city, filters.city));
      if (filters?.jobType) conditions.push(eq(job.jobType, filters.jobType));
      if (filters?.salaryMin !== undefined) {
        conditions.push(gte(job.salaryMin, filters.salaryMin));
      }
      if (filters?.salaryMax !== undefined) {
        conditions.push(lte(job.salaryMax, filters.salaryMax));
      }

      const jobQuery = conditions.length > 0
        ? this.db.select().from(job).where(and(...conditions))
        : this.db.select().from(job);

      const jobRows = await jobQuery.orderBy(desc(job.publishDate)).limit(50);

      const results: JobItem[] = jobRows.map((row: typeof job.$inferSelect) => {
        const { matchScore, matchReasons, gapSkills } = this.computeJobMatch(
          row,
          userSkillsRows,
          userCity,
        );
        return {
          ...this.toJobItem(row),
          matchScore,
          matchReasons,
          gapSkills,
        };
      });

      results.sort((a: JobItem, b: JobItem) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

      return results;
    } catch (error) {
      this.logger.error('获取推荐岗位失败', error as Error);
      throw error;
    }
  }

  async getRecommended(): Promise<JobItem[]> {
    return this.getRecommendedJobs();
  }
}
