import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, and } from 'drizzle-orm';
import { learningResource } from '@server/database/schema';
import type { LearningResource } from '@shared/api.interface';

@Injectable()
export class ResourceService {
  private readonly logger = new Logger(ResourceService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private toResource(row: typeof learningResource.$inferSelect): LearningResource {
    return {
      id: row.id,
      name: row.name,
      platform: row.platform,
      category: row.category,
      isFree: row.isFree,
      relatedSkill: row.relatedSkill,
      url: row.url,
      description: row.description,
      duration: row.duration,
    };
  }

  async findAll(category?: string): Promise<LearningResource[]> {
    try {
      const conditions = [];
      if (category && category !== 'all') {
        conditions.push(eq(learningResource.category, category));
      }
      const query = conditions.length > 0
        ? this.db.select().from(learningResource).where(and(...conditions))
        : this.db.select().from(learningResource);

      const rows = await query.orderBy(desc(learningResource.createdAt));
      return rows.map((row) => this.toResource(row));
    } catch (error) {
      this.logger.error('获取资源列表失败', error as Error);
      throw error;
    }
  }
}
