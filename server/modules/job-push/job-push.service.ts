import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, count } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { jobPushRecord } from '../../database/schema';
import type {
  JobPushListResponse,
  JobPushItem as JobPushItemType,
} from '@shared/api.interface';

const DEFAULT_USER_ID = '1847292357012580';

@Injectable()
export class JobPushService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getPushList(
    userId: string | undefined,
    status?: string,
    page = 1,
    pageSize = 20,
  ): Promise<JobPushListResponse> {
    const effectiveUserId = await this.resolveUserId(userId);
    const conditions = [eq(jobPushRecord.userId, effectiveUserId)];

    if (status === 'new') {
      conditions.push(eq(jobPushRecord.isIgnored, false));
    } else if (status === 'viewed') {
      conditions.push(eq(jobPushRecord.isViewed, true));
    } else if (status === 'applied') {
      conditions.push(eq(jobPushRecord.isApplied, true));
    } else if (status === 'ignored') {
      conditions.push(eq(jobPushRecord.isIgnored, true));
    }

    const whereClause = and(...conditions);

    const items = await this.db
      .select()
      .from(jobPushRecord)
      .where(whereClause)
      .orderBy(desc(jobPushRecord.matchScore), desc(jobPushRecord.pushedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(jobPushRecord)
      .where(whereClause);

    const [{ newCount }] = await this.db
      .select({ newCount: count() })
      .from(jobPushRecord)
      .where(
        and(
          eq(jobPushRecord.userId, effectiveUserId),
          eq(jobPushRecord.isViewed, false),
          eq(jobPushRecord.isIgnored, false),
        ),
      );

    return {
      items: items.map((item) => this.mapItem(item)),
      total: Number(total),
      newCount: Number(newCount),
    };
  }

  async markViewed(id: string, userId: string): Promise<void> {
    const updated = await this.db
      .update(jobPushRecord)
      .set({
        isViewed: true,
        viewedAt: new Date(),
        status: 'viewed',
      })
      .where(
        and(eq(jobPushRecord.id, id), eq(jobPushRecord.userId, userId)),
      )
      .returning({ id: jobPushRecord.id });

    if (updated.length === 0) {
      throw new NotFoundException('推送记录不存在');
    }
  }

  async markApplied(id: string, userId: string): Promise<void> {
    const updated = await this.db
      .update(jobPushRecord)
      .set({
        isApplied: true,
        appliedAt: new Date(),
        status: 'applied',
      })
      .where(
        and(eq(jobPushRecord.id, id), eq(jobPushRecord.userId, userId)),
      )
      .returning({ id: jobPushRecord.id });

    if (updated.length === 0) {
      throw new NotFoundException('推送记录不存在');
    }
  }

  async markIgnored(id: string, userId: string): Promise<void> {
    const updated = await this.db
      .update(jobPushRecord)
      .set({
        isIgnored: true,
        status: 'ignored',
      })
      .where(
        and(eq(jobPushRecord.id, id), eq(jobPushRecord.userId, userId)),
      )
      .returning({ id: jobPushRecord.id });

    if (updated.length === 0) {
      throw new NotFoundException('推送记录不存在');
    }
  }

  async refresh(userId: string): Promise<{ newCount: number }> {
    const effectiveUserId = await this.resolveUserId(userId);
    const [{ cnt }] = await this.db
      .select({ cnt: count() })
      .from(jobPushRecord)
      .where(
        and(
          eq(jobPushRecord.userId, effectiveUserId),
          eq(jobPushRecord.isViewed, false),
          eq(jobPushRecord.isIgnored, false),
        ),
      );
    return { newCount: Number(cnt) };
  }

  async getNewCount(userId: string): Promise<{ count: number }> {
    const effectiveUserId = await this.resolveUserId(userId);
    const [{ count: cnt }] = await this.db
      .select({ count: count() })
      .from(jobPushRecord)
      .where(
        and(
          eq(jobPushRecord.userId, effectiveUserId),
          eq(jobPushRecord.isViewed, false),
          eq(jobPushRecord.isIgnored, false),
        ),
      );
    return { count: Number(cnt) };
  }

  private async resolveUserId(userId: string | undefined): Promise<string> {
    if (!userId) return DEFAULT_USER_ID;
    const [{ cnt }] = await this.db
      .select({ cnt: count() })
      .from(jobPushRecord)
      .where(eq(jobPushRecord.userId, userId));
    if (Number(cnt) > 0) return userId;
    return DEFAULT_USER_ID;
  }

  private mapItem(item: typeof jobPushRecord.$inferSelect): JobPushItemType {
    return {
      id: item.id,
      jobId: item.jobId,
      jobTitle: item.jobTitle,
      company: item.company,
      city: item.city || '',
      salary: item.salary || '',
      matchScore: Number(item.matchScore),
      matchReasons: item.matchReasons || [],
      status: item.status,
      isViewed: item.isViewed,
      isApplied: item.isApplied,
      isIgnored: item.isIgnored,
      pushedAt: item.pushedAt.toISOString(),
    };
  }
}
