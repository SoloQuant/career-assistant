import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, asc, count } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { learningPlan, learningPlanItem } from '../../database/schema';
import type {
  LearningPlan as LearningPlanType,
  LearningPlanDetail,
  LearningPlanItem as LearningPlanItemType,
  LearningPlanListResponse,
  LearningPlanAdjustRequest,
} from '@shared/api.interface';

const DEFAULT_USER_ID = '1847292357012580';

@Injectable()
export class LearningPlanService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getPlans(userId: string): Promise<LearningPlanListResponse> {
    const plans = await this.db
      .select()
      .from(learningPlan)
      .where(eq(learningPlan.userId, userId))
      .orderBy(asc(learningPlan.startDate));

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(learningPlan)
      .where(eq(learningPlan.userId, userId));

    return {
      items: plans.map((p) => this.mapPlan(p)),
      total: Number(total),
    };
  }

  async getPlanDetail(id: string, userId: string): Promise<LearningPlanDetail> {
    const [plan] = await this.db
      .select()
      .from(learningPlan)
      .where(and(eq(learningPlan.id, id), eq(learningPlan.userId, userId)))
      .limit(1);

    if (!plan) {
      throw new NotFoundException('学习计划不存在');
    }

    const items = await this.db
      .select()
      .from(learningPlanItem)
      .where(eq(learningPlanItem.planId, id))
      .orderBy(asc(learningPlanItem.plannedDate), asc(learningPlanItem.orderIndex));

    const today = new Date().toISOString().split('T')[0];
    const todayTasks = items.filter(
      (item) => String(item.plannedDate).split('T')[0] === today,
    );
    const delayedCount = items.filter((item) => item.status === 'delayed').length;
    const completedToday = todayTasks.filter((item) => item.status === 'completed').length;

    return {
      ...this.mapPlan(plan),
      items: items.map((item) => this.mapItem(item)),
      todayTasks: todayTasks.map((item) => this.mapItem(item)),
      delayedCount,
      completedToday,
    };
  }

  async getCurrentPlan(userId: string): Promise<LearningPlanDetail> {
    const effectiveUserId = await this.resolveUserId(userId);
    const [plan] = await this.db
      .select()
      .from(learningPlan)
      .where(
        and(
          eq(learningPlan.userId, effectiveUserId),
          eq(learningPlan.status, 'active'),
        ),
      )
      .orderBy(asc(learningPlan.startDate))
      .limit(1);

    if (!plan) {
      throw new NotFoundException('暂无进行中的学习计划');
    }

    return this.getPlanDetail(plan.id, effectiveUserId);
  }

  private async resolveUserId(userId: string): Promise<string> {
    const [{ cnt }] = await this.db
      .select({ cnt: count() })
      .from(learningPlan)
      .where(eq(learningPlan.userId, userId));
    if (Number(cnt) > 0) return userId;
    return DEFAULT_USER_ID;
  }

  async adjustItem(
    itemId: string,
    dto: LearningPlanAdjustRequest,
    userId: string,
  ): Promise<void> {
    const patch: Partial<typeof learningPlanItem.$inferInsert> = {};
    if (dto.newStatus) {
      patch.status = dto.newStatus;
      if (dto.newStatus === 'completed') {
        patch.completedAt = new Date();
      }
    }
    if (dto.newDate) {
      const [existing] = await this.db
        .select()
        .from(learningPlanItem)
        .where(eq(learningPlanItem.id, itemId))
        .limit(1);
      if (existing && !existing.originalDate) {
        patch.originalDate = existing.plannedDate;
      }
      patch.plannedDate = dto.newDate;
    }
    if (dto.reason) {
      patch.adjustmentReason = dto.reason;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可调整字段');
    }

    const updated = await this.db
      .update(learningPlanItem)
      .set(patch)
      .where(eq(learningPlanItem.id, itemId))
      .returning({ id: learningPlanItem.id });

    if (updated.length === 0) {
      throw new NotFoundException('任务项不存在');
    }

    void userId;
  }

  async replan(planId: string, userId: string): Promise<LearningPlanDetail> {
    const [plan] = await this.db
      .select()
      .from(learningPlan)
      .where(and(eq(learningPlan.id, planId), eq(learningPlan.userId, userId)))
      .limit(1);

    if (!plan) {
      throw new NotFoundException('学习计划不存在');
    }

    const items = await this.db
      .select()
      .from(learningPlanItem)
      .where(eq(learningPlanItem.planId, planId))
      .orderBy(asc(learningPlanItem.plannedDate), asc(learningPlanItem.orderIndex));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const pendingOrDelayed = items.filter(
      (item) => item.status === 'pending' || item.status === 'delayed',
    );

    let currentDate = new Date(today);
    for (const item of pendingOrDelayed) {
      const itemDateStr = String(item.plannedDate).split('T')[0];
      const itemDate = new Date(itemDateStr);
      itemDate.setHours(0, 0, 0, 0);
      if (itemDate < today || item.status === 'delayed') {
        const newDateStr = currentDate.toISOString().split('T')[0];
        await this.db.update(learningPlanItem).set({
          plannedDate: newDateStr,
          originalDate: item.originalDate || item.plannedDate,
          adjustmentReason: '重新规划：未完成任务顺延',
          status: 'pending',
        }).where(eq(learningPlanItem.id, item.id));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return this.getPlanDetail(planId, userId);
  }

  private mapPlan(p: typeof learningPlan.$inferSelect): LearningPlanType {
    const total = p.totalTasks || 0;
    const completed = p.completedTasks || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      id: p.id,
      planName: p.planName,
      targetSkill: p.targetSkill || '',
      startDate: String(p.startDate).split('T')[0],
      endDate: String(p.endDate).split('T')[0],
      status: p.status,
      totalTasks: p.totalTasks,
      completedTasks: p.completedTasks,
      autoAdjust: p.autoAdjust,
      progress,
    };
  }

  private mapItem(item: typeof learningPlanItem.$inferSelect): LearningPlanItemType {
    return {
      id: item.id,
      planId: item.planId,
      title: item.title,
      description: item.description || '',
      skillId: item.skillId || undefined,
      taskType: item.taskType,
      plannedDate: String(item.plannedDate).split('T')[0],
      durationMinutes: item.durationMinutes,
      status: item.status,
      priority: item.priority,
      orderIndex: item.orderIndex,
      completedAt: item.completedAt ? item.completedAt.toISOString() : undefined,
      originalDate: item.originalDate
        ? String(item.originalDate).split('T')[0]
        : undefined,
      adjustmentReason: item.adjustmentReason || undefined,
    };
  }
}
