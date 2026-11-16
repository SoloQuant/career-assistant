import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { industryTrend, salaryPredictionLog, cityCostOfLiving, jobCompetition, skill, application } from '@server/database/schema';
import type {
  SalaryPredictionResult,
  SalaryPredictionRequest,
  SkillJobHeatmapItem,
  CompetitivenessAnalysis,
  CityCostItem,
  JobCompetitionItem,
  JobCompetitionListResponse,
} from '@shared/api.interface';

interface SalaryTrendPoint {
  period: string;
  avgSalary: number;
  demandCount: number;
  trendDirection: string;
  trendPercentage: number;
}

interface CityComparisonItem {
  city: string;
  avgSalary: number;
  demandCount: number;
  trendDirection: string;
}

interface TopSkillItem {
  skillName: string;
  count: number;
  trend: 'rising' | 'stable' | 'declining';
}

interface JobDemandItem {
  jobType: string;
  demandCount: number;
  trendDirection: string;
  trendPercentage: number;
}

interface PredictionLogItem extends SalaryPredictionResult {
  id: string;
  createdAt: string;
}

interface JobCompetitionQuery {
  page: number;
  pageSize: number;
  jobType?: string;
  city?: string;
  sort?: string;
}

interface DeliveryFunnelStage {
  name: string;
  count: number;
  rate: number;
}

interface DeliveryFunnelConversionRate {
  name: string;
  value: number;
}

interface DeliveryFunnelResponse {
  stages: DeliveryFunnelStage[];
  applicationCount: number;
  responseCount: number;
  interviewCount: number;
  offerCount: number;
  conversionRates: DeliveryFunnelConversionRate[];
  bottleneck: string;
}

// 目标岗位技能要求预设
const TARGET_JOB_SKILL_REQUIREMENTS: Record<string, { name: string; requiredLevel: number }[]> = {
  data_engineer: [
    { name: 'Python', requiredLevel: 80 },
    { name: 'SQL', requiredLevel: 85 },
    { name: 'Hadoop', requiredLevel: 70 },
    { name: 'Spark', requiredLevel: 75 },
    { name: '数据仓库', requiredLevel: 70 },
    { name: 'ETL', requiredLevel: 65 },
  ],
  data_analyst: [
    { name: 'SQL', requiredLevel: 80 },
    { name: 'Excel', requiredLevel: 75 },
    { name: 'Python', requiredLevel: 70 },
    { name: 'Tableau', requiredLevel: 65 },
    { name: '统计学', requiredLevel: 70 },
    { name: '数据可视化', requiredLevel: 70 },
  ],
  data_scientist: [
    { name: 'Python', requiredLevel: 85 },
    { name: '机器学习', requiredLevel: 80 },
    { name: '深度学习', requiredLevel: 70 },
    { name: '统计学', requiredLevel: 80 },
    { name: 'SQL', requiredLevel: 70 },
    { name: '数学建模', requiredLevel: 75 },
  ],
  backend: [
    { name: 'Java', requiredLevel: 80 },
    { name: 'Spring Boot', requiredLevel: 75 },
    { name: 'MySQL', requiredLevel: 75 },
    { name: 'Redis', requiredLevel: 70 },
    { name: '分布式系统', requiredLevel: 65 },
    { name: '数据结构与算法', requiredLevel: 75 },
  ],
  frontend: [
    { name: 'JavaScript', requiredLevel: 85 },
    { name: 'React', requiredLevel: 80 },
    { name: 'TypeScript', requiredLevel: 75 },
    { name: 'CSS', requiredLevel: 75 },
    { name: 'HTML', requiredLevel: 80 },
    { name: 'Node.js', requiredLevel: 65 },
  ],
  product_manager: [
    { name: '产品设计', requiredLevel: 75 },
    { name: '需求分析', requiredLevel: 80 },
    { name: '项目管理', requiredLevel: 70 },
    { name: '数据分析', requiredLevel: 70 },
    { name: '用户研究', requiredLevel: 65 },
    { name: '沟通协调', requiredLevel: 80 },
  ],
};

const DEFAULT_JOB_REQUIREMENTS: { name: string; requiredLevel: number }[] = [
  { name: 'Python', requiredLevel: 70 },
  { name: 'SQL', requiredLevel: 70 },
  { name: 'Excel', requiredLevel: 65 },
  { name: '沟通能力', requiredLevel: 75 },
  { name: '学习能力', requiredLevel: 80 },
  { name: '团队协作', requiredLevel: 75 },
];

@Injectable()
export class IndustryTrendService {
  private readonly logger = new Logger(IndustryTrendService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getSalaryTrend(jobType: string, city: string): Promise<SalaryTrendPoint[]> {
    try {
      // 按 period 降序取最近 3 个，再升序排列返回
      const allRows = await this.db
        .select({
          period: industryTrend.period,
          avgSalary: industryTrend.avgSalary,
          demandCount: industryTrend.demandCount,
          trendDirection: industryTrend.trendDirection,
          trendPercentage: industryTrend.trendPercentage,
        })
        .from(industryTrend)
        .where(
          and(
            eq(industryTrend.jobType, jobType),
            eq(industryTrend.city, city),
          ),
        )
        .orderBy(desc(industryTrend.period))
        .limit(3);

      const result = allRows
        .sort((a, b) => a.period.localeCompare(b.period))
        .map((row) => ({
          period: row.period,
          avgSalary: Number(row.avgSalary),
          demandCount: row.demandCount,
          trendDirection: row.trendDirection,
          trendPercentage: Number(row.trendPercentage),
        }));

      return result;
    } catch (error) {
      this.logger.error(
        `获取薪资趋势失败 jobType=${jobType} city=${city}`,
        error as Error,
      );
      throw error;
    }
  }

  async getCityComparison(jobType: string): Promise<CityComparisonItem[]> {
    try {
      // 先找出最新 period
      const latestRows = await this.db
        .select({
          city: industryTrend.city,
          period: industryTrend.period,
          avgSalary: industryTrend.avgSalary,
          demandCount: industryTrend.demandCount,
          trendDirection: industryTrend.trendDirection,
        })
        .from(industryTrend)
        .where(eq(industryTrend.jobType, jobType))
        .orderBy(desc(industryTrend.period));

      if (latestRows.length === 0) return [];

      const latestPeriod = latestRows[0].period;
      const latestPeriodRows = latestRows.filter((r) => r.period === latestPeriod);

      return latestPeriodRows.map((row) => ({
        city: row.city,
        avgSalary: Number(row.avgSalary),
        demandCount: row.demandCount,
        trendDirection: row.trendDirection,
      }));
    } catch (error) {
      this.logger.error(
        `获取城市薪资对比失败 jobType=${jobType}`,
        error as Error,
      );
      throw error;
    }
  }

  async getTopSkills(
    jobType?: string,
    period?: string,
  ): Promise<TopSkillItem[]> {
    try {
      const conditions = [];
      if (jobType) conditions.push(eq(industryTrend.jobType, jobType));

      // 如果没指定 period，用最新 period
      let targetPeriod: string | undefined = period;
      if (!targetPeriod) {
        const periodRows = await this.db
          .select({ period: industryTrend.period })
          .from(industryTrend)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(industryTrend.period))
          .limit(1);
        if (periodRows.length > 0) {
          targetPeriod = periodRows[0].period;
        }
      }

      if (!targetPeriod) return [];

      const allConditions = [...conditions, eq(industryTrend.period, targetPeriod)];

      const rows = await this.db
        .select({
          topSkills: industryTrend.topSkills,
          trendDirection: industryTrend.trendDirection,
        })
        .from(industryTrend)
        .where(and(...allConditions));

      // 在内存中聚合统计
      const skillStats = new Map<string, { count: number; directions: string[] }>();

      for (const row of rows) {
        const skills = row.topSkills || [];
        for (const skill of skills) {
          const existing = skillStats.get(skill);
          if (existing) {
            existing.count += 1;
            existing.directions.push(row.trendDirection);
          } else {
            skillStats.set(skill, { count: 1, directions: [row.trendDirection] });
          }
        }
      }

      const result: TopSkillItem[] = Array.from(skillStats.entries())
        .map(([skillName, stat]) => {
          // 统计趋势：取出现最多的方向
          const directionCount: Record<string, number> = {};
          for (const d of stat.directions) {
            directionCount[d] = (directionCount[d] || 0) + 1;
          }
          let topDirection = 'stable';
          let topCount = 0;
          for (const [dir, cnt] of Object.entries(directionCount)) {
            if (cnt > topCount) {
              topCount = cnt;
              topDirection = dir;
            }
          }
          const trend = (topDirection === 'rising' || topDirection === 'stable' || topDirection === 'declining')
            ? topDirection as 'rising' | 'stable' | 'declining'
            : 'stable' as const;
          return { skillName, count: stat.count, trend };
        })
        .sort((a, b) => b.count - a.count);

      return result;
    } catch (error) {
      this.logger.error(
        `获取热门技能排行失败 jobType=${jobType} period=${period}`,
        error as Error,
      );
      throw error;
    }
  }

  async getJobDemand(city?: string): Promise<JobDemandItem[]> {
    try {
      const conditions = [];
      if (city) conditions.push(eq(industryTrend.city, city));

      // 获取所有 period，按降序取最新
      const periodRows = await this.db
        .select({ period: industryTrend.period })
        .from(industryTrend)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(industryTrend.period))
        .limit(1);

      if (periodRows.length === 0) return [];

      const latestPeriod = periodRows[0].period;
      const allConditions = [...conditions, eq(industryTrend.period, latestPeriod)];

      const rows = await this.db
        .select({
          jobType: industryTrend.jobType,
          demandCount: industryTrend.demandCount,
          trendDirection: industryTrend.trendDirection,
          trendPercentage: industryTrend.trendPercentage,
        })
        .from(industryTrend)
        .where(and(...allConditions));

      // 按 jobType 聚合（可能有多个城市），取 demand_count 总和
      const jobStats = new Map<string, {
        demandCount: number;
        directions: string[];
        percentages: number[];
      }>();

      for (const row of rows) {
        const existing = jobStats.get(row.jobType);
        if (existing) {
          existing.demandCount += row.demandCount;
          existing.directions.push(row.trendDirection);
          existing.percentages.push(Number(row.trendPercentage));
        } else {
          jobStats.set(row.jobType, {
            demandCount: row.demandCount,
            directions: [row.trendDirection],
            percentages: [Number(row.trendPercentage)],
          });
        }
      }

      const result: JobDemandItem[] = Array.from(jobStats.entries())
        .map(([jobType, stat]) => {
          // 取出现最多的趋势方向
          const directionCount: Record<string, number> = {};
          for (const d of stat.directions) {
            directionCount[d] = (directionCount[d] || 0) + 1;
          }
          let topDirection = 'stable';
          let topCount = 0;
          for (const [dir, cnt] of Object.entries(directionCount)) {
            if (cnt > topCount) {
              topCount = cnt;
              topDirection = dir;
            }
          }
          const avgPercentage = stat.percentages.length > 0
            ? stat.percentages.reduce((s, v) => s + v, 0) / stat.percentages.length
            : 0;
          return {
            jobType,
            demandCount: stat.demandCount,
            trendDirection: topDirection,
            trendPercentage: Math.round(avgPercentage * 100) / 100,
          };
        })
        .sort((a, b) => b.demandCount - a.demandCount);

      return result;
    } catch (error) {
      this.logger.error(
        `获取岗位需求变化失败 city=${city}`,
        error as Error,
      );
      throw error;
    }
  }

  async predictSalary(
    userId: string,
    dto: SalaryPredictionRequest,
  ): Promise<SalaryPredictionResult> {
    try {
      const { city, jobType, skills, experienceYears } = dto;

      // 找到该城市+岗位的最新记录作为基准
      const baseRows = await this.db
        .select({
          avgSalary: industryTrend.avgSalary,
          topSkills: industryTrend.topSkills,
        })
        .from(industryTrend)
        .where(
          and(
            eq(industryTrend.jobType, jobType),
            eq(industryTrend.city, city),
          ),
        )
        .orderBy(desc(industryTrend.period))
        .limit(1);

      let baseSalary = 8000;
      let topSkills: string[] = [];
      let hasCityData = false;

      if (baseRows.length > 0) {
        baseSalary = Number(baseRows[0].avgSalary);
        topSkills = baseRows[0].topSkills || [];
        hasCityData = true;
      } else {
        // 没有该城市数据，尝试取同岗位所有城市的平均
        const jobRows = await this.db
          .select({
            avgSalary: industryTrend.avgSalary,
            topSkills: industryTrend.topSkills,
          })
          .from(industryTrend)
          .where(eq(industryTrend.jobType, jobType))
          .orderBy(desc(industryTrend.period))
          .limit(10);

        if (jobRows.length > 0) {
          const totalSalary = jobRows.reduce(
            (sum: number, row) => sum + Number(row.avgSalary),
            0,
          );
          baseSalary = Math.round(totalSalary / jobRows.length);
          // 合并所有 topSkills，取出现最多的
          const skillCount = new Map<string, number>();
          for (const row of jobRows) {
            for (const s of row.topSkills || []) {
              skillCount.set(s, (skillCount.get(s) || 0) + 1);
            }
          }
          topSkills = Array.from(skillCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([s]) => s);
        }
      }

      // 计算技能匹配度
      const userSkillsLower = skills.map((s: string) => s.toLowerCase());
      const topSkillsLower = topSkills.map((s: string) => s.toLowerCase());

      const matchedSkills: string[] = [];
      const topPositive: string[] = [];
      for (let i = 0; i < topSkills.length; i++) {
        const tsLower = topSkillsLower[i];
        if (userSkillsLower.some((us: string) => us === tsLower)) {
          matchedSkills.push(topSkills[i]);
          topPositive.push(topSkills[i]);
        }
      }

      const matchRate = topSkills.length > 0
        ? matchedSkills.length / topSkills.length
        : 0;

      // 经验加成
      const experienceBonus = experienceYears * 0.05;

      // 薪资范围计算
      const predictedMin = Math.round(
        baseSalary * (0.7 + matchRate * 0.3 + experienceBonus * 0.5),
      );
      const predictedMax = Math.round(
        baseSalary * (1.0 + matchRate * 0.4 + experienceBonus * 0.5),
      );
      const predictedAvg = Math.round((predictedMin + predictedMax) / 2);

      // 置信度
      const confidence = Math.min(
        0.95,
        0.5 + matchRate * 0.3 + (hasCityData ? 0.15 : 0),
      );

      // 缺失技能（岗位要求但用户不具备的前 3 个）
      const topNegative: string[] = topSkills
        .filter((s: string) => !userSkillsLower.includes(s.toLowerCase()))
        .slice(0, 3);

      const factors = { topPositive, topNegative };

      const result: SalaryPredictionResult = {
        city,
        jobType,
        skills,
        experienceYears,
        predictedMin,
        predictedMax,
        predictedAvg,
        confidence: Math.round(confidence * 100) / 100,
        factors,
      };

      // 保存预测记录
      await this.db.insert(salaryPredictionLog).values({
        city,
        jobType,
        skills,
        experienceYears: String(experienceYears),
        predictedMin,
        predictedMax,
        predictedAvg,
        confidence: String(confidence.toFixed(2)),
        factors: factors as any,
        createdBy: userId,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `薪资预测失败 userId=${userId} jobType=${dto.jobType} city=${dto.city}`,
        error as Error,
      );
      throw error;
    }
  }

  async getPredictionHistory(userId: string): Promise<PredictionLogItem[]> {
    try {
      const rows = await this.db
        .select({
          id: salaryPredictionLog.id,
          city: salaryPredictionLog.city,
          jobType: salaryPredictionLog.jobType,
          skills: salaryPredictionLog.skills,
          experienceYears: salaryPredictionLog.experienceYears,
          predictedMin: salaryPredictionLog.predictedMin,
          predictedMax: salaryPredictionLog.predictedMax,
          predictedAvg: salaryPredictionLog.predictedAvg,
          confidence: salaryPredictionLog.confidence,
          factors: salaryPredictionLog.factors,
          createdAt: salaryPredictionLog.createdAt,
        })
        .from(salaryPredictionLog)
        .where(
          sql`(${salaryPredictionLog.createdBy}).user_id = ${userId}`,
        )
        .orderBy(desc(salaryPredictionLog.createdAt));

      return rows.map((row) => ({
        id: row.id,
        city: row.city,
        jobType: row.jobType,
        skills: row.skills || [],
        experienceYears: Number(row.experienceYears),
        predictedMin: row.predictedMin,
        predictedMax: row.predictedMax,
        predictedAvg: row.predictedAvg,
        confidence: Number(row.confidence),
        factors: (row.factors as any) || { topPositive: [], topNegative: [] },
        createdAt: (row.createdAt as Date).toISOString(),
      }));
    } catch (error) {
      this.logger.error(
        `获取薪资预测历史失败 userId=${userId}`,
        error as Error,
      );
      throw error;
    }
  }

  async getSkillJobHeatmap(): Promise<SkillJobHeatmapItem[]> {
    try {
      // 获取最新 period
      const periodRows = await this.db
        .select({ period: industryTrend.period })
        .from(industryTrend)
        .orderBy(desc(industryTrend.period))
        .limit(1);

      if (periodRows.length === 0) return [];

      const latestPeriod = periodRows[0].period;

      const rows = await this.db
        .select({
          jobType: industryTrend.jobType,
          city: industryTrend.city,
          topSkills: industryTrend.topSkills,
          avgSalary: industryTrend.avgSalary,
        })
        .from(industryTrend)
        .where(eq(industryTrend.period, latestPeriod));

      if (rows.length === 0) return [];

      // 按 jobType 聚合，取各岗位的 topSkills（取第一条记录的 topSkills 和平均薪资）
      const jobStats = new Map<string, {
        topSkills: string[];
        avgSalaries: number[];
      }>();

      for (const row of rows) {
        const existing = jobStats.get(row.jobType);
        if (existing) {
          existing.avgSalaries.push(Number(row.avgSalary));
          // 以第一条的 topSkills 为准（通常同岗位各城市 topSkills 相似）
        } else {
          jobStats.set(row.jobType, {
            topSkills: row.topSkills || [],
            avgSalaries: [Number(row.avgSalary)],
          });
        }
      }

      // 统计每个技能在各岗位的出现情况
      const skillJobMap = new Map<string, Map<string, {
        matchRate: number;
        avgSalary: number;
      }>>();

      // 计算每个技能的总频率（用于选 top 15）
      const skillFrequency = new Map<string, number>();

      for (const [jobType, stat] of jobStats.entries()) {
        const avgSalary = stat.avgSalaries.length > 0
          ? Math.round(
              stat.avgSalaries.reduce((s, v) => s + v, 0) / stat.avgSalaries.length,
            )
          : 0;

        const skills = stat.topSkills;
        for (let i = 0; i < skills.length; i++) {
          const skillName = skills[i];
          // 位置权重：第一名权重最高，使用 1 / (index + 1) 作为权重
          const positionWeight = 1 / (i + 1);

          if (!skillJobMap.has(skillName)) {
            skillJobMap.set(skillName, new Map());
          }
          skillJobMap.get(skillName)!.set(jobType, {
            matchRate: positionWeight,
            avgSalary,
          });

          skillFrequency.set(
            skillName,
            (skillFrequency.get(skillName) || 0) + positionWeight,
          );
        }
      }

      // 取出现频率最高的前 15 个技能
      const topSkills = Array.from(skillFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([skillName]) => skillName);

      const result: SkillJobHeatmapItem[] = topSkills.map((skillName) => {
        const jobTypesMap = skillJobMap.get(skillName)!;
        const jobTypes = Array.from(jobTypesMap.entries()).map(
          ([jobType, data]) => ({
            jobType,
            matchRate: Math.round(data.matchRate * 100) / 100,
            avgSalary: data.avgSalary,
          }),
        );
        return { skillName, jobTypes };
      });

      return result;
    } catch (error) {
      this.logger.error('获取技能-岗位热力图失败', error as Error);
      throw error;
    }
  }

  async getCompetitivenessAnalysis(
    userId: string,
    targetJob: string,
  ): Promise<CompetitivenessAnalysis> {
    try {
      // 读取用户技能列表
      const userSkillRows = await this.db
        .select({
          name: skill.name,
          masteryLevel: skill.masteryLevel,
        })
        .from(skill)
        .where(sql`(${skill.createdBy}).user_id = ${userId}`);

      const userSkillMap = new Map<string, number>();
      for (const row of userSkillRows) {
        userSkillMap.set(row.name.toLowerCase(), row.masteryLevel);
      }

      // 获取目标岗位要求的技能
      const requirements =
        TARGET_JOB_SKILL_REQUIREMENTS[targetJob] || DEFAULT_JOB_REQUIREMENTS;

      const strengths: CompetitivenessAnalysis['strengths'] = [];
      const weaknesses: CompetitivenessAnalysis['weaknesses'] = [];
      const matchedSkills: string[] = [];
      const missingSkills: string[] = [];
      const userData: number[] = [];
      const requiredData: number[] = [];
      const indicators: string[] = [];

      let totalMatchRatio = 0;

      for (const req of requirements) {
        const userLevel: number =
          userSkillMap.get(req.name.toLowerCase()) ?? 0;
        const gap: number = userLevel - req.requiredLevel;

        indicators.push(req.name);
        userData.push(userLevel);
        requiredData.push(req.requiredLevel);

        const matchRatio: number = req.requiredLevel > 0
          ? Math.min(1, userLevel / req.requiredLevel)
          : 1;
        totalMatchRatio += matchRatio;

        if (gap >= 0) {
          strengths.push({
            name: req.name,
            userLevel,
            requiredLevel: req.requiredLevel,
            gap,
          });
          matchedSkills.push(req.name);
        } else {
          weaknesses.push({
            name: req.name,
            userLevel,
            requiredLevel: req.requiredLevel,
            gap,
          });
          missingSkills.push(req.name);
        }
      }

      const overallScore: number =
        requirements.length > 0
          ? Math.round((totalMatchRatio / requirements.length) * 100)
          : 0;

      // 生成改进建议
      const improvementSuggestions: string[] = [];
      const topWeaknesses = [...weaknesses]
        .sort((a, b) => a.gap - b.gap)
        .slice(0, 3);

      for (const w of topWeaknesses) {
        const gapAbs = Math.abs(w.gap);
        if (gapAbs >= 30) {
          improvementSuggestions.push(
            `【${w.name}】差距较大（${gapAbs}分），建议系统学习：从基础概念到实战项目，预计需要2-3个月集中提升。`,
          );
        } else if (gapAbs >= 15) {
          improvementSuggestions.push(
            `【${w.name}】有一定差距（${gapAbs}分），建议针对性强化：通过专项练习和项目实践巩固提升。`,
          );
        } else {
          improvementSuggestions.push(
            `【${w.name}】接近要求（${gapAbs}分），只需查漏补缺：补充细节知识和面试技巧即可达标。`,
          );
        }
      }

      if (weaknesses.length > 3) {
        improvementSuggestions.push(
          `此外还有 ${weaknesses.length - 3} 项技能需要提升，建议制定分阶段学习计划，优先攻克核心技能。`,
        );
      }

      if (strengths.length > 0) {
        improvementSuggestions.push(
          `你的优势技能（${strengths.length}项）已达到或超过岗位要求，可在简历和面试中重点突出。`,
        );
      }

      return {
        targetJob,
        overallScore,
        strengths,
        weaknesses,
        matchedSkills,
        missingSkills,
        improvementSuggestions,
        skillRadarData: {
          userData,
          requiredData,
          indicators,
        },
      };
    } catch (error) {
      this.logger.error(
        `竞争力分析失败 userId=${userId} targetJob=${targetJob}`,
        error as Error,
      );
      throw error;
    }
  }

  async getCityCostComparison(): Promise<{ items: CityCostItem[] }> {
    try {
      const rows = await this.db
        .select()
        .from(cityCostOfLiving)
        .orderBy(cityCostOfLiving.city);

      const items: CityCostItem[] = rows.map(
        (row: typeof cityCostOfLiving.$inferSelect) => ({
          id: row.id,
          city: row.city,
          avgRent: Number(row.avgRent),
          avgFood: Number(row.avgFood),
          avgTransport: Number(row.avgTransport),
          avgUtilities: Number(row.avgUtilities),
          avgEntertainment: Number(row.avgEntertainment),
          avgTotal: Number(row.avgTotal),
          costIndex: Number(row.costIndex),
          avgSalary: Number(row.avgSalary),
          disposableIncome: Number(row.disposableIncome),
          createdAt: (row.createdAt as Date).toISOString(),
        }),
      );

      return { items };
    } catch (error) {
      this.logger.error('获取城市生活成本对比失败', error as Error);
      throw error;
    }
  }

  async getJobCompetitionList(
    query: JobCompetitionQuery,
  ): Promise<JobCompetitionListResponse> {
    try {
      const { page, pageSize, jobType, city, sort } = query;
      const conditions = [];

      if (jobType) {
        conditions.push(eq(jobCompetition.jobType, jobType));
      }
      if (city) {
        conditions.push(eq(jobCompetition.city, city));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await this.db
        .select({ count: count() })
        .from(jobCompetition)
        .where(whereClause);
      const total: number = totalResult[0]?.count ?? 0;

      let orderColumn;
      if (sort === 'acceptanceRate') {
        orderColumn = jobCompetition.acceptanceRate;
      } else {
        orderColumn = jobCompetition.hotScore;
      }

      const offset = (page - 1) * pageSize;
      const rows = await this.db
        .select()
        .from(jobCompetition)
        .where(whereClause)
        .orderBy(desc(orderColumn))
        .limit(pageSize)
        .offset(offset);

      const items: JobCompetitionItem[] = rows.map(
        (row: typeof jobCompetition.$inferSelect) => ({
          id: row.id,
          jobTitle: row.jobTitle,
          jobType: row.jobType ?? undefined,
          city: row.city ?? undefined,
          totalApplicants: row.totalApplicants,
          totalPositions: row.totalPositions,
          acceptanceRate: Number(row.acceptanceRate),
          hotLevel: (row.hotLevel as 'cold' | 'medium' | 'hot' | 'very_hot'),
          hotScore: row.hotScore,
          avgSalary: row.avgSalary !== undefined && row.avgSalary !== null
            ? Number(row.avgSalary)
            : undefined,
          trendDirection:
            row.trendDirection !== undefined && row.trendDirection !== null
              ? (row.trendDirection as 'rising' | 'stable' | 'declining')
              : undefined,
          trendPercentage:
            row.trendPercentage !== undefined && row.trendPercentage !== null
              ? Number(row.trendPercentage)
              : undefined,
          requiredSkills: row.requiredSkills || [],
          createdAt: (row.createdAt as Date).toISOString(),
        }),
      );

      return { items, total };
    } catch (error) {
      this.logger.error(
        `获取岗位竞争度列表失败 jobType=${query.jobType} city=${query.city}`,
        error as Error,
      );
      throw error;
    }
  }

  async getJobCompetitionDetail(
    id: string,
  ): Promise<JobCompetitionItem | null> {
    try {
      const rows = await this.db
        .select()
        .from(jobCompetition)
        .where(eq(jobCompetition.id, id))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        jobTitle: row.jobTitle,
        jobType: row.jobType ?? undefined,
        city: row.city ?? undefined,
        totalApplicants: row.totalApplicants,
        totalPositions: row.totalPositions,
        acceptanceRate: Number(row.acceptanceRate),
        hotLevel: row.hotLevel as 'cold' | 'medium' | 'hot' | 'very_hot',
        hotScore: row.hotScore,
        avgSalary:
          row.avgSalary !== undefined && row.avgSalary !== null
            ? Number(row.avgSalary)
            : undefined,
        trendDirection:
          row.trendDirection !== undefined && row.trendDirection !== null
            ? (row.trendDirection as 'rising' | 'stable' | 'declining')
            : undefined,
        trendPercentage:
          row.trendPercentage !== undefined && row.trendPercentage !== null
            ? Number(row.trendPercentage)
            : undefined,
        requiredSkills: row.requiredSkills || [],
        createdAt: (row.createdAt as Date).toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `获取岗位竞争详情失败 id=${id}`,
        error as Error,
      );
      throw error;
    }
  }

  async getDeliveryFunnel(userId: string): Promise<DeliveryFunnelResponse> {
    try {
      // 统计各状态数量
      const rows = await this.db
        .select({
          status: application.status,
          count: count(),
        })
        .from(application)
        .where(sql`(${application.createdBy}).user_id = ${userId}`)
        .groupBy(application.status);

      const statusCount = new Map<string, number>();
      for (const row of rows) {
        statusCount.set(row.status, row.count);
      }

      const submitted: number = statusCount.get('submitted') ?? 0;
      const writtenTest: number = statusCount.get('written_test') ?? 0;
      const interview: number = statusCount.get('interview') ?? 0;
      const offer: number = statusCount.get('offer') ?? 0;
      const rejection: number = statusCount.get('rejection') ?? 0;

      const applicationCount: number = submitted + writtenTest + interview + offer + rejection;
      // 响应数 = 笔试 + 面试 + offer + 拒信（即有反馈的）
      const responseCount: number = writtenTest + interview + offer + rejection;
      const interviewCount: number = interview + offer;
      const offerCount: number = offer;

      // 各阶段
      const stages: DeliveryFunnelStage[] = [
        { name: '投递', count: applicationCount, rate: 100 },
        {
          name: '获得响应',
          count: responseCount,
          rate: applicationCount > 0
            ? Math.round((responseCount / applicationCount) * 10000) / 100
            : 0,
        },
        {
          name: '进入面试',
          count: interviewCount,
          rate: applicationCount > 0
            ? Math.round((interviewCount / applicationCount) * 10000) / 100
            : 0,
        },
        {
          name: '拿到Offer',
          count: offerCount,
          rate: applicationCount > 0
            ? Math.round((offerCount / applicationCount) * 10000) / 100
            : 0,
        },
      ];

      // 各环节转化率
      const conversionRates: DeliveryFunnelConversionRate[] = [
        {
          name: '投递→响应',
          value: applicationCount > 0
            ? Math.round((responseCount / applicationCount) * 10000) / 100
            : 0,
        },
        {
          name: '响应→面试',
          value: responseCount > 0
            ? Math.round((interviewCount / responseCount) * 10000) / 100
            : 0,
        },
        {
          name: '面试→Offer',
          value: interviewCount > 0
            ? Math.round((offerCount / interviewCount) * 10000) / 100
            : 0,
        },
      ];

      // 找出瓶颈环节（转化率最低的环节）
      let bottleneck = '暂无数据';
      if (conversionRates.length > 0 && applicationCount > 0) {
        const validRates = conversionRates.filter((r) => r.value > 0 || r.name === '投递→响应');
        if (validRates.length > 0) {
          const minRate = validRates.reduce((min, curr) =>
            curr.value < min.value ? curr : min
          );
          bottleneck = minRate.name;
        }
      }

      return {
        stages,
        applicationCount,
        responseCount,
        interviewCount,
        offerCount,
        conversionRates,
        bottleneck,
      };
    } catch (error) {
      this.logger.error(
        `获取投递漏斗分析失败 userId=${userId}`,
        error as Error,
      );
      throw error;
    }
  }
}
