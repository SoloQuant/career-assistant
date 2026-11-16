import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { note } from '@server/database/schema';
import type {
  NoteItem,
  NoteListResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
} from '@shared/api.interface';

interface NoteListQuery {
  page: number;
  pageSize: number;
  category?: string;
  keyword?: string;
  isPinned?: boolean;
}

interface NoteCategoryCount {
  category: string;
  count: number;
}

@Injectable()
export class NoteService {
  private readonly logger = new Logger(NoteService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private mapToNoteItem(row: typeof note.$inferSelect): NoteItem {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      tags: row.tags ?? [],
      isPinned: row.isPinned,
      wordCount: row.wordCount,
      relatedSkill: row.relatedSkill ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getNoteList(
    userId: string,
    query: NoteListQuery,
  ): Promise<NoteListResponse> {
    try {
      const { page, pageSize, category, keyword, isPinned } = query;
      const conditions = [
        sql`(${note.createdBy}).user_id = ${userId}`,
      ];

      if (category) {
        conditions.push(eq(note.category, category));
      }
      if (keyword) {
        conditions.push(
          sql`(${note.title} ILIKE ${`%${keyword}%`} OR ${note.content} ILIKE ${`%${keyword}%`})`,
        );
      }
      if (isPinned !== undefined) {
        conditions.push(eq(note.isPinned, isPinned));
      }

      const whereClause = and(...conditions);

      const totalResult = await this.db
        .select({ count: count() })
        .from(note)
        .where(whereClause);
      const total: number = totalResult[0]?.count ?? 0;

      const offset = (page - 1) * pageSize;
      const rows = await this.db
        .select()
        .from(note)
        .where(whereClause)
        .orderBy(desc(note.isPinned), desc(note.updatedAt))
        .limit(pageSize)
        .offset(offset);

      const items: NoteItem[] = rows.map((row: typeof note.$inferSelect) =>
        this.mapToNoteItem(row),
      );

      return { items, total };
    } catch (error) {
      this.logger.error(`获取笔记列表失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async getCategories(userId: string): Promise<NoteCategoryCount[]> {
    try {
      const rows = await this.db
        .select({
          category: note.category,
          count: count(),
        })
        .from(note)
        .where(sql`(${note.createdBy}).user_id = ${userId}`)
        .groupBy(note.category)
        .orderBy(asc(note.category));

      return rows.map((row: { category: string; count: number }) => ({
        category: row.category,
        count: row.count,
      }));
    } catch (error) {
      this.logger.error(`获取笔记分类失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async getNoteDetail(
    userId: string,
    id: string,
  ): Promise<NoteItem | null> {
    try {
      const rows = await this.db
        .select()
        .from(note)
        .where(
          and(
            eq(note.id, id),
            sql`(${note.createdBy}).user_id = ${userId}`,
          ),
        )
        .limit(1);

      if (rows.length === 0) return null;
      return this.mapToNoteItem(rows[0]);
    } catch (error) {
      this.logger.error(
        `获取笔记详情失败 userId=${userId} id=${id}`,
        error as Error,
      );
      throw error;
    }
  }

  async createNote(
    userId: string,
    dto: CreateNoteRequest,
  ): Promise<NoteItem> {
    try {
      const content: string = dto.content ?? '';
      const wordCount: number = content.length;

      const insertData: typeof note.$inferInsert = {
        title: dto.title,
        content,
        category: dto.category ?? 'general',
        tags: dto.tags ?? [],
        isPinned: dto.isPinned ?? false,
        wordCount,
        relatedSkill: dto.relatedSkill ?? null,
        createdBy: userId,
        updatedBy: userId,
      };

      const rows = await this.db
        .insert(note)
        .values(insertData)
        .returning();

      return this.mapToNoteItem(rows[0]);
    } catch (error) {
      this.logger.error(`创建笔记失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async updateNote(
    userId: string,
    id: string,
    dto: UpdateNoteRequest,
  ): Promise<NoteItem | null> {
    try {
      const patch: Partial<typeof note.$inferInsert> = {};
      if (dto.title !== undefined) patch.title = dto.title;
      if (dto.content !== undefined) {
        patch.content = dto.content;
        patch.wordCount = dto.content.length;
      }
      if (dto.category !== undefined) patch.category = dto.category;
      if (dto.tags !== undefined) patch.tags = dto.tags;
      if (dto.isPinned !== undefined) patch.isPinned = dto.isPinned;
      if (dto.relatedSkill !== undefined) {
        patch.relatedSkill = dto.relatedSkill ?? null;
      }

      if (Object.keys(patch).length === 0) {
        return this.getNoteDetail(userId, id);
      }

      patch.updatedBy = userId;
      patch.updatedAt = new Date();

      const rows = await this.db
        .update(note)
        .set(patch)
        .where(
          and(
            eq(note.id, id),
            sql`(${note.createdBy}).user_id = ${userId}`,
          ),
        )
        .returning();

      if (rows.length === 0) return null;
      return this.mapToNoteItem(rows[0]);
    } catch (error) {
      this.logger.error(
        `更新笔记失败 userId=${userId} id=${id}`,
        error as Error,
      );
      throw error;
    }
  }

  async deleteNote(userId: string, id: string): Promise<boolean> {
    try {
      const rows = await this.db
        .delete(note)
        .where(
          and(
            eq(note.id, id),
            sql`(${note.createdBy}).user_id = ${userId}`,
          ),
        )
        .returning({ id: note.id });

      return rows.length > 0;
    } catch (error) {
      this.logger.error(
        `删除笔记失败 userId=${userId} id=${id}`,
        error as Error,
      );
      throw error;
    }
  }
}
