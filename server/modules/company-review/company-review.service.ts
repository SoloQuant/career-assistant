import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { companyReview } from '@server/database/schema';
import { eq, and, count, desc, asc, ilike, sql } from 'drizzle-orm';
import type {
  CompanyReview as CompanyReviewDto,
  CompanyReviewListResponse,
  CreateCompanyReviewRequest,
} from '@shared/api.interface';

interface CompanyReviewAggregate {
  companyName: string;
  avgOverallRating: number;
  reviewCount: number;
  avgWorkLifeBalance: number;
  avgSalary: number;
  avgGrowth: number;
  avgCulture: number;
  recentReviews: CompanyReviewDto[];
}

@Injectable()
export class CompanyReviewService {
  private readonly logger = new Logger(CompanyReviewService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private toDto(row: typeof companyReview.$inferSelect): CompanyReviewDto {
    return {
      id: row.id,
      companyName: row.companyName,
      companyId: row.companyId ?? undefined,
      overallRating: Number(row.overallRating),
      workLifeBalanceRating: row.workLifeBalanceRating != null ? Number(row.workLifeBalanceRating) : undefined,
      salaryRating: row.salaryRating != null ? Number(row.salaryRating) : undefined,
      growthRating: row.growthRating != null ? Number(row.growthRating) : undefined,
      cultureRating: row.cultureRating != null ? Number(row.cultureRating) : undefined,
      overtimeLevel: row.overtimeLevel ?? undefined,
      realSalary: row.realSalary ?? undefined,
      interviewExperience: row.interviewExperience ?? undefined,
      pros: row.pros ?? undefined,
      cons: row.cons ?? undefined,
      jobTitle: row.jobTitle ?? undefined,
      employmentStatus: row.employmentStatus ?? undefined,
      isAnonymous: row.isAnonymous,
      helpfulCount: row.helpfulCount,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getList(
    page: number,
    pageSize: number,
    companyName?: string,
    sort?: string,
  ): Promise<CompanyReviewListResponse> {
    const whereConditions = [];
    if (companyName) {
      whereConditions.push(ilike(companyReview.companyName, `%${companyName}%`));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    let orderBy;
    if (sort === 'rating') {
      orderBy = desc(companyReview.overallRating);
    } else if (sort === 'time') {
      orderBy = desc(companyReview.createdAt);
    } else {
      orderBy = desc(companyReview.createdAt);
    }

    const offset = (page - 1) * pageSize;

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(companyReview)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(companyReview)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;
    const items: CompanyReviewDto[] = rows.map((row: typeof companyReview.$inferSelect) => this.toDto(row));

    return { items, total };
  }

  async getById(id: string): Promise<CompanyReviewDto> {
    const rows = await this.db
      .select()
      .from(companyReview)
      .where(eq(companyReview.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('评价不存在');
    }

    return this.toDto(rows[0]);
  }

  async create(userId: string, dto: CreateCompanyReviewRequest): Promise<CompanyReviewDto> {
    const insertValues: typeof companyReview.$inferInsert = {
      companyName: dto.companyName,
      overallRating: String(dto.overallRating),
      workLifeBalanceRating: dto.workLifeBalanceRating != null ? String(dto.workLifeBalanceRating) : undefined,
      salaryRating: dto.salaryRating != null ? String(dto.salaryRating) : undefined,
      growthRating: dto.growthRating != null ? String(dto.growthRating) : undefined,
      cultureRating: dto.cultureRating != null ? String(dto.cultureRating) : undefined,
      overtimeLevel: dto.overtimeLevel,
      realSalary: dto.realSalary,
      interviewExperience: dto.interviewExperience,
      pros: dto.pros,
      cons: dto.cons,
      jobTitle: dto.jobTitle,
      employmentStatus: dto.employmentStatus,
      isAnonymous: dto.isAnonymous ?? true,
    };

    const inserted = await this.db
      .insert(companyReview)
      .values(insertValues)
      .returning();

    return this.toDto(inserted[0]);
  }

  async markHelpful(id: string): Promise<{ helpfulCount: number }> {
    const updated = await this.db
      .update(companyReview)
      .set({ helpfulCount: sql<number>`${companyReview.helpfulCount} + 1` })
      .where(eq(companyReview.id, id))
      .returning({ helpfulCount: companyReview.helpfulCount });

    if (updated.length === 0) {
      throw new NotFoundException('评价不存在');
    }

    return { helpfulCount: updated[0].helpfulCount };
  }

  async getCompanyAggregate(companyName: string): Promise<CompanyReviewAggregate> {
    const aggregateResult = await this.db
      .select({
        avgOverallRating: sql<string>`AVG(${companyReview.overallRating})`,
        reviewCount: count(),
        avgWorkLifeBalance: sql<string>`AVG(${companyReview.workLifeBalanceRating})`,
        avgSalary: sql<string>`AVG(${companyReview.salaryRating})`,
        avgGrowth: sql<string>`AVG(${companyReview.growthRating})`,
        avgCulture: sql<string>`AVG(${companyReview.cultureRating})`,
      })
      .from(companyReview)
      .where(eq(companyReview.companyName, companyName));

    const agg = aggregateResult[0];
    if (!agg || agg.reviewCount === 0) {
      return {
        companyName,
        avgOverallRating: 0,
        reviewCount: 0,
        avgWorkLifeBalance: 0,
        avgSalary: 0,
        avgGrowth: 0,
        avgCulture: 0,
        recentReviews: [],
      };
    }

    const recentRows = await this.db
      .select()
      .from(companyReview)
      .where(eq(companyReview.companyName, companyName))
      .orderBy(desc(companyReview.createdAt))
      .limit(10);

    const recentReviews: CompanyReviewDto[] = recentRows.map(
      (row: typeof companyReview.$inferSelect) => this.toDto(row),
    );

    return {
      companyName,
      avgOverallRating: Number(agg.avgOverallRating) || 0,
      reviewCount: agg.reviewCount,
      avgWorkLifeBalance: Number(agg.avgWorkLifeBalance) || 0,
      avgSalary: Number(agg.avgSalary) || 0,
      avgGrowth: Number(agg.avgGrowth) || 0,
      avgCulture: Number(agg.avgCulture) || 0,
      recentReviews,
    };
  }
}
