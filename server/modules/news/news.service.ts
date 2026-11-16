import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, and } from 'drizzle-orm';
import { news } from '@server/database/schema';
import type { NewsItem } from '@shared/api.interface';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private toNewsItem(row: typeof news.$inferSelect): NewsItem {
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      content: row.content,
      source: row.source,
      url: row.url,
      category: row.category,
      tags: row.tags ?? [],
      publishDate: row.publishDate.toISOString(),
    };
  }

  async findAll(category?: string): Promise<NewsItem[]> {
    try {
      const conditions = [];
      if (category && category !== 'all') {
        conditions.push(eq(news.category, category));
      }
      const query = conditions.length > 0
        ? this.db.select().from(news).where(and(...conditions))
        : this.db.select().from(news);

      const rows = await query.orderBy(desc(news.publishDate));
      return rows.map((row) => this.toNewsItem(row));
    } catch (error) {
      this.logger.error('获取资讯列表失败', error as Error);
      throw error;
    }
  }

  async findById(id: string): Promise<NewsItem | null> {
    try {
      const rows = await this.db
        .select()
        .from(news)
        .where(eq(news.id, id))
        .limit(1);
      if (rows.length === 0) return null;
      return this.toNewsItem(rows[0]);
    } catch (error) {
      this.logger.error(`获取资讯详情失败 id=${id}`, error as Error);
      throw error;
    }
  }
}
