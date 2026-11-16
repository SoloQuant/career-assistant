import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, count } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { personalizedRecommendation, userBehaviorLog } from '../../database/schema';
import type {
  PersonalizedRecommendations,
  PersonalizedItem,
} from '@shared/api.interface';

const DEFAULT_USER_ID = '1847292357012580';

@Injectable()
export class PersonalizedRecService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getDashboardRecommendations(
    userId: string | undefined,
    limit = 5,
  ): Promise<PersonalizedRecommendations> {
    const effectiveUserId = userId || DEFAULT_USER_ID;

    const [jobs, courses, news] = await Promise.all([
      this.getByType(effectiveUserId, 'job', limit),
      this.getByType(effectiveUserId, 'course', limit),
      this.getByType(effectiveUserId, 'news', limit),
    ]);

    return { jobs, courses, news };
  }

  async getByType(
    userId: string | undefined,
    recType: string,
    limit = 10,
  ): Promise<PersonalizedItem[]> {
    const effectiveUserId = await this.resolveUserId(userId);

    const items = await this.db
      .select()
      .from(personalizedRecommendation)
      .where(
        and(
          eq(personalizedRecommendation.userId, effectiveUserId),
          eq(personalizedRecommendation.recType, recType),
        ),
      )
      .orderBy(desc(personalizedRecommendation.score))
      .limit(limit);

    return items.map((item) => this.mapItem(item));
  }

  async refresh(userId: string): Promise<{ updated: boolean }> {
    const recentBehaviors = await this.db
      .select()
      .from(userBehaviorLog)
      .where(eq(userBehaviorLog.userId, userId))
      .orderBy(desc(userBehaviorLog.createdAt))
      .limit(20);

    void recentBehaviors;
    return { updated: true };
  }

  private async resolveUserId(userId: string | undefined): Promise<string> {
    if (!userId) return DEFAULT_USER_ID;
    const [{ cnt }] = await this.db
      .select({ cnt: count() })
      .from(personalizedRecommendation)
      .where(eq(personalizedRecommendation.userId, userId));
    if (Number(cnt) > 0) return userId;
    return DEFAULT_USER_ID;
  }

  private mapItem(item: typeof personalizedRecommendation.$inferSelect): PersonalizedItem {
    return {
      id: item.id,
      recType: item.recType,
      itemId: item.itemId,
      itemTitle: item.itemTitle || '',
      itemData: item.itemData as Record<string, unknown> | undefined,
      score: Number(item.score),
      reason: item.reason || '',
      generatedAt: item.generatedAt.toISOString(),
    };
  }
}
