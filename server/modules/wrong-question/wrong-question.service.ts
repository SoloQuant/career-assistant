import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count } from 'drizzle-orm';
import { wrongQuestion } from '@server/database/schema';
import type {
  WrongQuestionItem,
  WrongQuestionListResponse,
  AddWrongQuestionRequest,
  UpdateWrongQuestionRequest,
} from '@shared/api.interface';

interface WrongQuestionStats {
  totalWrong: number;
  mastered: number;
  byCategory: { category: string; count: number }[];
  bySourceType: { type: string; count: number }[];
}

interface WrongQuestionFilter {
  page: number;
  pageSize: number;
  sourceType?: 'interview' | 'exam';
  category?: string;
  isMastered?: boolean;
}

function mapRowToItem(row: {
  id: string;
  sourceType: string;
  sourceId: string;
  questionTitle: string;
  questionContent: string | null;
  userAnswer: string | null;
  correctAnswer: string | null;
  analysis: string | null;
  wrongCount: number;
  isMastered: boolean;
  category: string | null;
  tags: string[];
  lastWrongAt: Date;
  createdAt: Date;
}): WrongQuestionItem {
  return {
    id: row.id,
    sourceType: row.sourceType as 'interview' | 'exam',
    sourceId: row.sourceId,
    questionTitle: row.questionTitle,
    questionContent: row.questionContent ?? undefined,
    userAnswer: row.userAnswer ?? undefined,
    correctAnswer: row.correctAnswer ?? undefined,
    analysis: row.analysis ?? undefined,
    wrongCount: row.wrongCount,
    isMastered: row.isMastered,
    category: row.category ?? undefined,
    tags: row.tags,
    lastWrongAt: row.lastWrongAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class WrongQuestionService {
  private readonly logger = new Logger(WrongQuestionService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getList(userId: string, filter: WrongQuestionFilter): Promise<WrongQuestionListResponse> {
    const conditions = [];
    conditions.push(eq(wrongQuestion.createdBy, userId));
    if (filter.sourceType) {
      conditions.push(eq(wrongQuestion.sourceType, filter.sourceType));
    }
    if (filter.category) {
      conditions.push(eq(wrongQuestion.category, filter.category));
    }
    if (filter.isMastered !== undefined) {
      conditions.push(eq(wrongQuestion.isMastered, filter.isMastered));
    }

    const offset = (filter.page - 1) * filter.pageSize;
    const whereClause = and(...conditions);

    const rows = await this.db
      .select()
      .from(wrongQuestion)
      .where(whereClause)
      .orderBy(desc(wrongQuestion.lastWrongAt))
      .limit(filter.pageSize)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(wrongQuestion)
      .where(whereClause);

    const items: WrongQuestionItem[] = rows.map((row) => mapRowToItem(row));

    return { items, total };
  }

  async getDetail(userId: string, id: string): Promise<WrongQuestionItem> {
    const rows = await this.db
      .select()
      .from(wrongQuestion)
      .where(eq(wrongQuestion.id, id));

    if (rows.length === 0) {
      throw new NotFoundException('错题不存在');
    }

    const row = rows[0];
    if (row.createdBy !== userId) {
      throw new ForbiddenException('无权访问该错题');
    }

    return mapRowToItem(row);
  }

  async addWrongQuestion(userId: string, dto: AddWrongQuestionRequest): Promise<WrongQuestionItem> {
    // Check if same sourceId already exists for this user
    const existing = await this.db
      .select()
      .from(wrongQuestion)
      .where(
        and(
          eq(wrongQuestion.createdBy, userId),
          eq(wrongQuestion.sourceId, dto.sourceId),
        ),
      );

    if (existing.length > 0) {
      // wrongCount + 1, update lastWrongAt
      const updated = await this.db
        .update(wrongQuestion)
        .set({
          wrongCount: existing[0].wrongCount + 1,
          lastWrongAt: new Date(),
        })
        .where(eq(wrongQuestion.id, existing[0].id))
        .returning();
      return mapRowToItem(updated[0]);
    }

    // Create new
    const inserted = await this.db
      .insert(wrongQuestion)
      .values({
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        questionTitle: dto.questionTitle,
        questionContent: dto.questionContent ?? null,
        userAnswer: dto.userAnswer ?? null,
        correctAnswer: dto.correctAnswer ?? null,
        analysis: dto.analysis ?? null,
        category: dto.category ?? null,
        tags: dto.tags ?? [],
      })
      .returning();

    return mapRowToItem(inserted[0]);
  }

  async updateWrongQuestion(
    userId: string,
    id: string,
    dto: UpdateWrongQuestionRequest,
  ): Promise<WrongQuestionItem> {
    // Check ownership
    const existing = await this.db
      .select()
      .from(wrongQuestion)
      .where(eq(wrongQuestion.id, id));

    if (existing.length === 0) {
      throw new NotFoundException('错题不存在');
    }
    if (existing[0].createdBy !== userId) {
      throw new ForbiddenException('无权修改该错题');
    }

    const patch: Partial<typeof wrongQuestion.$inferInsert> = {};
    if (dto.isMastered !== undefined) {
      patch.isMastered = dto.isMastered;
    }
    if (dto.wrongCount !== undefined) {
      patch.wrongCount = dto.wrongCount;
    }

    const updated = await this.db
      .update(wrongQuestion)
      .set(patch)
      .where(eq(wrongQuestion.id, id))
      .returning();

    return mapRowToItem(updated[0]);
  }

  async deleteWrongQuestion(userId: string, id: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(wrongQuestion)
      .where(eq(wrongQuestion.id, id));

    if (existing.length === 0) {
      throw new NotFoundException('错题不存在');
    }
    if (existing[0].createdBy !== userId) {
      throw new ForbiddenException('无权删除该错题');
    }

    await this.db
      .delete(wrongQuestion)
      .where(eq(wrongQuestion.id, id));
  }

  async getStats(userId: string): Promise<WrongQuestionStats> {
    const rows = await this.db
      .select()
      .from(wrongQuestion)
      .where(eq(wrongQuestion.createdBy, userId));

    const totalWrong = rows.length;
    const mastered = rows.filter((row) => row.isMastered).length;

    const byCategoryMap = new Map<string, number>();
    const bySourceTypeMap = new Map<string, number>();

    for (const row of rows) {
      const cat = row.category ?? '未分类';
      byCategoryMap.set(cat, (byCategoryMap.get(cat) ?? 0) + 1);

      const st = row.sourceType;
      bySourceTypeMap.set(st, (bySourceTypeMap.get(st) ?? 0) + 1);
    }

    const byCategory = Array.from(byCategoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));
    const bySourceType = Array.from(bySourceTypeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    return { totalWrong, mastered, byCategory, bySourceType };
  }
}
