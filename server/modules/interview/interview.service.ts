import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { interviewQuestion, interviewRecord } from '@server/database/schema';
import type {
  InterviewQuestionWithRecord,
  InterviewListResponse,
  InterviewListParams,
  UpdateInterviewRecordRequest,
  InterviewRecord,
  InterviewStats,
} from '@shared/api.interface';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getQuestionList(
    userId: string,
    params: InterviewListParams & { page: number; pageSize: number },
  ): Promise<InterviewListResponse> {
    try {
      const { category, jobType, difficulty, isFavorite, isWrong, keyword, page, pageSize } = params;

      const questionConditions = [];
      if (category) questionConditions.push(eq(interviewQuestion.category, category));
      if (jobType) questionConditions.push(eq(interviewQuestion.jobType, jobType));
      if (difficulty) questionConditions.push(eq(interviewQuestion.difficulty, difficulty));
      if (keyword) {
        const pattern = `%${keyword}%`;
        questionConditions.push(sql`(${interviewQuestion.title} ILIKE ${pattern} OR ${interviewQuestion.content} ILIKE ${pattern})`);
      }

      const recordJoinConditions = [
        eq(interviewRecord.questionId, interviewQuestion.id),
        sql`(${interviewRecord.createdBy}).user_id = ${userId}`,
      ];

      // Build the where conditions for the main query
      const mainWhere = questionConditions.length > 0 ? and(...questionConditions) : undefined;

      // Base query with left join
      const baseQueryBuilder = this.db
        .select({
          question: interviewQuestion,
          record: interviewRecord,
        })
        .from(interviewQuestion)
        .leftJoin(
          interviewRecord,
          and(...recordJoinConditions),
        );

      const baseQuery = mainWhere
        ? baseQueryBuilder.where(mainWhere)
        : baseQueryBuilder;

      // Count total
      let totalRows: { count: number }[];

      if (isFavorite === true || isWrong === true) {
        // When filtering by record fields, count via inner join
        const recordFilterConditions = [...recordJoinConditions];
        if (isFavorite === true) {
          recordFilterConditions.push(eq(interviewRecord.isFavorite, true));
        }
        if (isWrong === true) {
          recordFilterConditions.push(eq(interviewRecord.isWrong, true));
        }

        const countJoinQueryBuilder = this.db
          .select({ count: count() })
          .from(interviewQuestion)
          .innerJoin(
            interviewRecord,
            and(...recordFilterConditions),
          );

        const countQuery = questionConditions.length > 0
          ? countJoinQueryBuilder.where(and(...questionConditions))
          : countJoinQueryBuilder;

        totalRows = await countQuery;
      } else {
        const totalQueryBuilder = this.db
          .select({ count: count() })
          .from(interviewQuestion);
        const totalQuery = questionConditions.length > 0
          ? totalQueryBuilder.where(and(...questionConditions))
          : totalQueryBuilder;
        totalRows = await totalQuery;
      }

      const total = Number(totalRows[0]?.count ?? 0);

      // Paginate
      const offset = (page - 1) * pageSize;
      const rows = await baseQuery
        .orderBy(desc(interviewQuestion.createdAt))
        .limit(pageSize)
        .offset(offset);

      const items: InterviewQuestionWithRecord[] = rows.map((row) =>
        this.mapQuestionWithRecord(row.question, row.record),
      );

      return {
        items,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(`获取面试题列表失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async getQuestionById(
    userId: string,
    id: string,
  ): Promise<InterviewQuestionWithRecord | null> {
    try {
      const rows = await this.db
        .select({
          question: interviewQuestion,
          record: interviewRecord,
        })
        .from(interviewQuestion)
        .leftJoin(
          interviewRecord,
          and(
            eq(interviewRecord.questionId, interviewQuestion.id),
            sql`(${interviewRecord.createdBy}).user_id = ${userId}`,
          ),
        )
        .where(eq(interviewQuestion.id, id))
        .limit(1);

      if (rows.length === 0) return null;
      return this.mapQuestionWithRecord(rows[0].question, rows[0].record);
    } catch (error) {
      this.logger.error(`获取题目详情失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async getStats(userId: string): Promise<InterviewStats> {
    try {
      // Total questions
      const totalResult = await this.db
        .select({ count: count() })
        .from(interviewQuestion);
      const totalQuestions = Number(totalResult[0]?.count ?? 0);

      // User's record stats
      const statsResult = await this.db
        .select({
          attempted: sql<number>`count(*) filter (where ${interviewRecord.attemptCount} > 0)`,
          correct: sql<number>`count(*) filter (where ${interviewRecord.status} = 'correct')`,
          wrong: sql<number>`count(*) filter (where ${interviewRecord.isWrong} = true)`,
          favorite: sql<number>`count(*) filter (where ${interviewRecord.isFavorite} = true)`,
        })
        .from(interviewRecord)
        .where(sql`(${interviewRecord.createdBy}).user_id = ${userId}`);

      const stats = statsResult[0];
      const attempted = Number(stats?.attempted ?? 0);
      const correct = Number(stats?.correct ?? 0);
      const wrong = Number(stats?.wrong ?? 0);
      const favorite = Number(stats?.favorite ?? 0);
      const correctRate = attempted > 0 ? Math.round((correct / attempted) * 100) / 100 : 0;

      return {
        totalQuestions,
        attempted,
        correct,
        wrong,
        favorite,
        correctRate,
      };
    } catch (error) {
      this.logger.error(`获取刷题统计失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async upsertRecord(
    userId: string,
    questionId: string,
    dto: UpdateInterviewRecordRequest,
  ): Promise<InterviewRecord> {
    try {
      // Check if question exists
      const questionRows = await this.db
        .select({ id: interviewQuestion.id })
        .from(interviewQuestion)
        .where(eq(interviewQuestion.id, questionId))
        .limit(1);

      if (questionRows.length === 0) {
        throw new NotFoundException('题目不存在');
      }

      // Find existing record
      const existingRows = await this.db
        .select()
        .from(interviewRecord)
        .where(
          and(
            eq(interviewRecord.questionId, questionId),
            sql`(${interviewRecord.createdBy}).user_id = ${userId}`,
          ),
        )
        .limit(1);

      const shouldIncrementAttempt =
        dto.status !== undefined || dto.userAnswer !== undefined;

      if (existingRows.length > 0) {
        // Update existing record
        const patch: Partial<typeof interviewRecord.$inferInsert> = {};
        if (dto.status !== undefined) patch.status = dto.status;
        if (dto.isFavorite !== undefined) patch.isFavorite = dto.isFavorite;
        if (dto.isWrong !== undefined) patch.isWrong = dto.isWrong;
        if (dto.userAnswer !== undefined) patch.userAnswer = dto.userAnswer;
        if (dto.note !== undefined) patch.note = dto.note;

        if (shouldIncrementAttempt) {
          patch.attemptCount = sql`${interviewRecord.attemptCount} + 1` as unknown as number;
          patch.lastAttemptAt = new Date();
        }

        const updated = await this.db
          .update(interviewRecord)
          .set(patch)
          .where(eq(interviewRecord.id, existingRows[0].id))
          .returning();

        return this.mapRecord(updated[0]);
      }

      // Create new record
      const insertData: typeof interviewRecord.$inferInsert = {
        questionId,
        status: dto.status ?? 'unattempted',
        isFavorite: dto.isFavorite ?? false,
        isWrong: dto.isWrong ?? false,
        userAnswer: dto.userAnswer ?? '',
        note: dto.note ?? '',
        attemptCount: shouldIncrementAttempt ? 1 : 0,
        lastAttemptAt: shouldIncrementAttempt ? new Date() : null,
        createdBy: userId,
      };

      const inserted = await this.db
        .insert(interviewRecord)
        .values(insertData)
        .returning();

      return this.mapRecord(inserted[0]);
    } catch (error) {
      this.logger.error(
        `更新做题记录失败 questionId=${questionId}`,
        error as Error,
      );
      throw error;
    }
  }

  async getFavorites(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<InterviewListResponse> {
    try {
      // Count total favorites
      const countResult = await this.db
        .select({ count: count() })
        .from(interviewRecord)
        .innerJoin(
          interviewQuestion,
          eq(interviewRecord.questionId, interviewQuestion.id),
        )
        .where(
          and(
            sql`(${interviewRecord.createdBy}).user_id = ${userId}`,
            eq(interviewRecord.isFavorite, true),
          ),
        );

      const total = Number(countResult[0]?.count ?? 0);
      const offset = (page - 1) * pageSize;

      const rows = await this.db
        .select({
          question: interviewQuestion,
          record: interviewRecord,
        })
        .from(interviewRecord)
        .innerJoin(
          interviewQuestion,
          eq(interviewRecord.questionId, interviewQuestion.id),
        )
        .where(
          and(
            sql`(${interviewRecord.createdBy}).user_id = ${userId}`,
            eq(interviewRecord.isFavorite, true),
          ),
        )
        .orderBy(desc(interviewRecord.updatedAt))
        .limit(pageSize)
        .offset(offset);

      const items: InterviewQuestionWithRecord[] = rows.map((row) =>
        this.mapQuestionWithRecord(row.question, row.record),
      );

      return {
        items,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(`获取收藏列表失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async getWrongBook(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<InterviewListResponse> {
    try {
      const countResult = await this.db
        .select({ count: count() })
        .from(interviewRecord)
        .innerJoin(
          interviewQuestion,
          eq(interviewRecord.questionId, interviewQuestion.id),
        )
        .where(
          and(
            sql`(${interviewRecord.createdBy}).user_id = ${userId}`,
            eq(interviewRecord.isWrong, true),
          ),
        );

      const total = Number(countResult[0]?.count ?? 0);
      const offset = (page - 1) * pageSize;

      const rows = await this.db
        .select({
          question: interviewQuestion,
          record: interviewRecord,
        })
        .from(interviewRecord)
        .innerJoin(
          interviewQuestion,
          eq(interviewRecord.questionId, interviewQuestion.id),
        )
        .where(
          and(
            sql`(${interviewRecord.createdBy}).user_id = ${userId}`,
            eq(interviewRecord.isWrong, true),
          ),
        )
        .orderBy(desc(interviewRecord.updatedAt))
        .limit(pageSize)
        .offset(offset);

      const items: InterviewQuestionWithRecord[] = rows.map((row) =>
        this.mapQuestionWithRecord(row.question, row.record),
      );

      return {
        items,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(`获取错题本失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async getCategories(): Promise<{
    categories: string[];
    jobTypes: string[];
    difficulties: string[];
  }> {
    try {
      const catResult = await this.db
        .select({ category: interviewQuestion.category })
        .from(interviewQuestion)
        .groupBy(interviewQuestion.category)
        .orderBy(interviewQuestion.category);

      const jobResult = await this.db
        .select({ jobType: interviewQuestion.jobType })
        .from(interviewQuestion)
        .groupBy(interviewQuestion.jobType)
        .orderBy(interviewQuestion.jobType);

      const diffResult = await this.db
        .select({ difficulty: interviewQuestion.difficulty })
        .from(interviewQuestion)
        .groupBy(interviewQuestion.difficulty)
        .orderBy(interviewQuestion.difficulty);

      return {
        categories: catResult.map((r: { category: string }) => r.category),
        jobTypes: jobResult.map((r: { jobType: string }) => r.jobType),
        difficulties: diffResult.map((r: { difficulty: string }) => r.difficulty),
      };
    } catch (error) {
      this.logger.error('获取分类信息失败', error as Error);
      throw error;
    }
  }

  private mapQuestionWithRecord(
    q: typeof interviewQuestion.$inferSelect,
    r: typeof interviewRecord.$inferSelect | null,
  ): InterviewQuestionWithRecord {
    const question: InterviewQuestionWithRecord = {
      id: q.id,
      title: q.title,
      content: q.content,
      answer: q.answer,
      category: q.category as 'technical' | 'behavior' | 'hr',
      jobType: q.jobType,
      difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
      tags: q.tags ?? [],
      source: q.source,
    };
    if (r) {
      question.record = this.mapRecord(r);
    }
    return question;
  }

  private mapRecord(
    r: typeof interviewRecord.$inferSelect,
  ): InterviewRecord {
    return {
      id: r.id,
      questionId: r.questionId,
      status: r.status as 'unattempted' | 'correct' | 'wrong' | 'marked',
      isFavorite: r.isFavorite,
      isWrong: r.isWrong,
      userAnswer: r.userAnswer,
      note: r.note,
      attemptCount: r.attemptCount,
      lastAttemptAt: r.lastAttemptAt ? r.lastAttemptAt.toISOString() : undefined,
    };
  }
}
