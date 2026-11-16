import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { courseRecommendation } from '@server/database/schema';
import { eq, and, count, desc, asc, ilike, inArray, sql } from 'drizzle-orm';
import type {
  CourseItem,
  CourseListResponse,
} from '@shared/api.interface';

@Injectable()
export class CourseRecService {
  private readonly logger = new Logger(CourseRecService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private toDto(row: typeof courseRecommendation.$inferSelect): CourseItem {
    return {
      id: row.id,
      title: row.title,
      platform: row.platform,
      platformUrl: row.platformUrl ?? undefined,
      skillName: row.skillName,
      category: row.category ?? undefined,
      difficulty: (row.difficulty as 'beginner' | 'intermediate' | 'hard') ?? 'beginner',
      estimatedHours: row.estimatedHours != null ? Number(row.estimatedHours) : undefined,
      priority: row.priority,
      description: row.description ?? undefined,
      coverUrl: row.coverUrl ?? undefined,
      rating: row.rating != null ? Number(row.rating) : undefined,
      studentCount: row.studentCount ?? undefined,
      instructor: row.instructor ?? undefined,
      isFree: row.isFree,
      tags: row.tags ?? [],
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getList(
    page: number,
    pageSize: number,
    filters: {
      skillName?: string;
      category?: string;
      difficulty?: string;
      platform?: string;
      sort?: string;
    },
  ): Promise<CourseListResponse> {
    const whereConditions = [];
    if (filters.skillName) {
      whereConditions.push(ilike(courseRecommendation.skillName, `%${filters.skillName}%`));
    }
    if (filters.category) {
      whereConditions.push(eq(courseRecommendation.category, filters.category));
    }
    if (filters.difficulty) {
      whereConditions.push(eq(courseRecommendation.difficulty, filters.difficulty));
    }
    if (filters.platform) {
      whereConditions.push(eq(courseRecommendation.platform, filters.platform));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    let orderBy;
    switch (filters.sort) {
      case 'priority':
        orderBy = desc(courseRecommendation.priority);
        break;
      case 'rating':
        orderBy = desc(courseRecommendation.rating);
        break;
      case 'studentCount':
        orderBy = desc(courseRecommendation.studentCount);
        break;
      default:
        orderBy = desc(courseRecommendation.priority);
    }

    const offset = (page - 1) * pageSize;

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(courseRecommendation)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(courseRecommendation)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;
    const items: CourseItem[] = rows.map(
      (row: typeof courseRecommendation.$inferSelect) => this.toDto(row),
    );

    return { items, total };
  }

  async getById(id: string): Promise<CourseItem> {
    const rows = await this.db
      .select()
      .from(courseRecommendation)
      .where(eq(courseRecommendation.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('课程不存在');
    }

    return this.toDto(rows[0]);
  }

  async getPersonalizedRecommend(
    targetSkills: string[],
    page: number,
    pageSize: number,
  ): Promise<CourseListResponse> {
    const offset = (page - 1) * pageSize;

    if (targetSkills.length === 0) {
      const [rows, countResult] = await Promise.all([
        this.db
          .select()
          .from(courseRecommendation)
          .orderBy(desc(courseRecommendation.priority), desc(courseRecommendation.rating))
          .limit(pageSize)
          .offset(offset),
        this.db.select({ count: count() }).from(courseRecommendation),
      ]);

      const total = countResult[0]?.count ?? 0;
      const items: CourseItem[] = rows.map(
        (row: typeof courseRecommendation.$inferSelect) => this.toDto(row),
      );
      return { items, total };
    }

    const skillLowerList: string[] = targetSkills.map((s: string) => s.toLowerCase());
    const likeConditions = skillLowerList.map(
      (skill: string) => sql`LOWER(${courseRecommendation.skillName}) LIKE ${`%${skill}%`}`,
    );

    const whereClause = sql.join(likeConditions, sql` OR `);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(courseRecommendation)
        .where(whereClause)
        .orderBy(desc(courseRecommendation.priority), desc(courseRecommendation.rating))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(courseRecommendation)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;
    const items: CourseItem[] = rows.map(
      (row: typeof courseRecommendation.$inferSelect) => this.toDto(row),
    );

    return { items, total };
  }

  async getPlatforms(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ platform: courseRecommendation.platform })
      .from(courseRecommendation)
      .where(sql`${courseRecommendation.platform} IS NOT NULL`)
      .orderBy(asc(courseRecommendation.platform));

    return rows
      .map((row: { platform: string | null }) => row.platform)
      .filter((p: string | null): p is string => p != null && p !== '');
  }
}
