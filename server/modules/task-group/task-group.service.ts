import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  CapabilityService,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, asc, sql } from 'drizzle-orm';
import { taskGroup, taskMilestone, taskSubTask } from '@server/database/schema';
import type {
  TaskGroup,
  TaskGroupSummary,
  TaskMilestone,
  TaskSubTask,
  CreateTaskGroupDto,
  UpdateTaskGroupDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateSubTaskDto,
  UpdateSubTaskDto,
  ReorderMilestonesDto,
  ReorderSubTasksDto,
  TaskSplitPreview,
  CreateTaskSplitDto,
  TaskOverviewStats,
  SkillWithMastery,
} from '@shared/api.interface';
import type { IntelligentTaskSplitterOneInput } from '@shared/plugin-types';
import { TaskGroupSkillService } from './task-group-skill.service';

function calcProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 10000) / 100;
}
function calcStatus(p: number): 'pending' | 'in_progress' | 'completed' {
  if (p >= 100) return 'completed';
  if (p <= 0) return 'pending';
  return 'in_progress';
}

type MilestoneInsert = typeof taskMilestone.$inferInsert;
type SubTaskInsert = typeof taskSubTask.$inferInsert;

@Injectable()
export class TaskGroupService {
  private readonly logger = new Logger(TaskGroupService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly capabilityService: CapabilityService,
    private readonly skillService: TaskGroupSkillService,
  ) {}

  private gs(r: typeof taskGroup.$inferSelect): TaskGroupSummary {
    return {
      id: r.id, title: r.title, description: r.description,
      relatedSkills: r.relatedSkills ?? [],
      priority: r.priority as TaskGroupSummary['priority'],
      status: r.status as TaskGroupSummary['status'],
      dueDate: r.dueDate ?? undefined,
      totalMilestones: r.totalMilestones, totalSubTasks: r.totalSubTasks,
      completedSubTasks: r.completedSubTasks, progress: Number(r.progress),
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    };
  }
  private ms(r: typeof taskMilestone.$inferSelect): TaskMilestone {
    return {
      id: r.id, groupId: r.groupId, title: r.title, description: r.description,
      sortOrder: r.sortOrder, totalSubTasks: r.totalSubTasks,
      completedSubTasks: r.completedSubTasks, progress: Number(r.progress),
      subTasks: [],
      relatedSkillIds: [],
    };
  }
  private ss(r: typeof taskSubTask.$inferSelect): TaskSubTask {
    return {
      id: r.id, milestoneId: r.milestoneId, groupId: r.groupId,
      title: r.title, description: r.description, sortOrder: r.sortOrder,
      estimatedMinutes: r.estimatedMinutes, isCompleted: r.isCompleted,
      completedAt: r.completedAt ? r.completedAt.toISOString() : undefined,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
      relatedSkillIds: [],
    };
  }

  private async recalcGroup(tx: PostgresJsDatabase, groupId: string) {
    const rows = await tx
      .select({ totalSubTasks: taskGroup.totalSubTasks, completedSubTasks: taskGroup.completedSubTasks })
      .from(taskGroup).where(eq(taskGroup.id, groupId)).limit(1);
    if (rows.length === 0) return;
    const { totalSubTasks, completedSubTasks } = rows[0];
    const progress = calcProgress(completedSubTasks, totalSubTasks);
    await tx.update(taskGroup).set({
      progress: String(progress), status: calcStatus(progress),
    }).where(eq(taskGroup.id, groupId));
  }

  private async recalcMilestone(tx: PostgresJsDatabase, milestoneId: string) {
    const rows = await tx
      .select({ totalSubTasks: taskMilestone.totalSubTasks, completedSubTasks: taskMilestone.completedSubTasks })
      .from(taskMilestone).where(eq(taskMilestone.id, milestoneId)).limit(1);
    if (rows.length === 0) return;
    const { totalSubTasks, completedSubTasks } = rows[0];
    await tx.update(taskMilestone).set({
      progress: String(calcProgress(completedSubTasks, totalSubTasks)),
    }).where(eq(taskMilestone.id, milestoneId));
  }

  async findAllGroups(): Promise<TaskGroupSummary[]> {
    const rows = await this.db.select().from(taskGroup).orderBy(desc(taskGroup.createdAt));
    return rows.map((r) => this.gs(r));
  }

  async findGroupById(id: string): Promise<TaskGroup | null> {
    const groups = await this.db.select().from(taskGroup).where(eq(taskGroup.id, id)).limit(1);
    if (groups.length === 0) return null;
    const milestones = await this.db.select().from(taskMilestone)
      .where(eq(taskMilestone.groupId, id)).orderBy(asc(taskMilestone.sortOrder));
    const subTasks = await this.db.select().from(taskSubTask)
      .where(eq(taskSubTask.groupId, id)).orderBy(asc(taskSubTask.sortOrder));
    const byM = new Map<string, TaskSubTask[]>();
    for (const st of subTasks) {
      const arr = byM.get(st.milestoneId) ?? [];
      arr.push(this.ss(st));
      byM.set(st.milestoneId, arr);
    }
    const ml = milestones.map((m) => ({ ...this.ms(m), subTasks: byM.get(m.id) ?? [] }));

    // 填充各层级关联技能 ID
    const skillsResult = await this.skillService.getSkillsByGroup(id);
    for (const m of ml) {
      const mSkills = skillsResult.milestoneSkillsMap[m.id] ?? [];
      m.relatedSkillIds = mSkills.map((s: SkillWithMastery) => s.id);
      for (const st of m.subTasks) {
        const stSkills = skillsResult.subTaskSkillsMap[st.id] ?? [];
        st.relatedSkillIds = stSkills.map((s: SkillWithMastery) => s.id);
      }
    }

    const relatedSkillIds = skillsResult.groupSkills.map(
      (s: SkillWithMastery) => s.id,
    );

    return {
      ...this.gs(groups[0]),
      relatedSkillIds,
      milestones: ml,
    };
  }

  async createGroup(dto: CreateTaskGroupDto): Promise<TaskGroup> {
    const totalSub = dto.milestones.reduce((s: number, m) => s + (m.subTasks?.length ?? 0), 0);
    const result = await this.db.transaction(async (tx) => {
      const [g] = await tx.insert(taskGroup).values({
        title: dto.title, description: dto.description ?? '',
        relatedSkills: dto.relatedSkills ?? [], priority: dto.priority ?? 'medium',
        status: 'pending', dueDate: dto.dueDate ?? null,
        totalMilestones: dto.milestones.length, totalSubTasks: totalSub,
        completedSubTasks: 0, progress: '0',
      }).returning();

      const ml: TaskMilestone[] = [];
      for (let i = 0; i < dto.milestones.length; i++) {
        const m = dto.milestones[i];
        const sts = m.subTasks ?? [];
        const [mRow] = await tx.insert(taskMilestone).values({
          groupId: g.id, title: m.title, description: m.description ?? '',
          sortOrder: m.sortOrder ?? i, totalSubTasks: sts.length,
          completedSubTasks: 0, progress: '0',
        }).returning();
        const sl: TaskSubTask[] = [];
        for (let j = 0; j < sts.length; j++) {
          const s = sts[j];
          const [sRow] = await tx.insert(taskSubTask).values({
            milestoneId: mRow.id, groupId: g.id, title: s.title,
            description: s.description ?? '', sortOrder: s.sortOrder ?? j,
            estimatedMinutes: s.estimatedMinutes ?? 60,
          }).returning();
          sl.push(this.ss(sRow));
        }
        ml.push({ ...this.ms(mRow), subTasks: sl });
      }
      return { group: g, milestones: ml };
    });
    return {
      ...this.gs(result.group),
      relatedSkillIds: [],
      milestones: result.milestones,
    };
  }

  async updateGroup(id: string, dto: UpdateTaskGroupDto): Promise<TaskGroupSummary> {
    const patch: Partial<typeof taskGroup.$inferInsert> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.relatedSkills !== undefined) patch.relatedSkills = dto.relatedSkills;
    if (dto.priority !== undefined) patch.priority = dto.priority;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.dueDate !== undefined) patch.dueDate = dto.dueDate ?? null;
    const updated = await this.db.update(taskGroup).set(patch)
      .where(eq(taskGroup.id, id)).returning();
    if (updated.length === 0) throw new NotFoundException('总任务不存在');
    return this.gs(updated[0]);
  }

  async deleteGroup(id: string): Promise<{ id: string }> {
    const deleted = await this.db.delete(taskGroup)
      .where(eq(taskGroup.id, id)).returning({ id: taskGroup.id });
    if (deleted.length === 0) throw new NotFoundException('总任务不存在');
    return { id: deleted[0].id };
  }

  async createMilestone(dto: CreateMilestoneDto): Promise<TaskMilestone> {
    const result = await this.db.transaction(async (tx) => {
      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${taskMilestone.sortOrder}), -1)` })
        .from(taskMilestone).where(eq(taskMilestone.groupId, dto.groupId));
      const [mRow] = await tx.insert(taskMilestone).values({
        groupId: dto.groupId, title: dto.title, description: dto.description ?? '',
        sortOrder: dto.sortOrder ?? max + 1,
      }).returning();
      await tx.update(taskGroup).set({
        totalMilestones: sql<number>`${taskGroup.totalMilestones} + 1`,
      }).where(eq(taskGroup.id, dto.groupId));
      return mRow;
    });
    return this.ms(result);
  }

  async updateMilestone(id: string, dto: UpdateMilestoneDto): Promise<TaskMilestone> {
    const patch: Partial<MilestoneInsert> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    const updated = await this.db.update(taskMilestone).set(patch)
      .where(eq(taskMilestone.id, id)).returning();
    if (updated.length === 0) throw new NotFoundException('里程碑不存在');
    return this.ms(updated[0]);
  }

  async deleteMilestone(id: string): Promise<{ id: string }> {
    const result = await this.db.transaction(async (tx) => {
      const milestones = await tx.select().from(taskMilestone)
        .where(eq(taskMilestone.id, id)).limit(1);
      if (milestones.length === 0) return null;
      const m = milestones[0];
      await tx.delete(taskMilestone).where(eq(taskMilestone.id, id));
      await tx.update(taskGroup).set({
        totalMilestones: sql<number>`${taskGroup.totalMilestones} - 1`,
        totalSubTasks: sql<number>`${taskGroup.totalSubTasks} - ${m.totalSubTasks}`,
        completedSubTasks: sql<number>`${taskGroup.completedSubTasks} - ${m.completedSubTasks}`,
      }).where(eq(taskGroup.id, m.groupId));
      await this.recalcGroup(tx, m.groupId);
      return { id };
    });
    if (!result) throw new NotFoundException('里程碑不存在');
    return { id: result.id };
  }

  async reorderMilestones(dto: ReorderMilestonesDto): Promise<{ success: true }> {
    await this.db.transaction(async (tx) => {
      for (const item of dto.orders) {
        await tx.update(taskMilestone).set({ sortOrder: item.sortOrder })
          .where(eq(taskMilestone.id, item.id));
      }
    });
    return { success: true };
  }

  async createSubTask(dto: CreateSubTaskDto): Promise<TaskSubTask> {
    const result = await this.db.transaction(async (tx) => {
      const milestones = await tx.select().from(taskMilestone)
        .where(eq(taskMilestone.id, dto.milestoneId)).limit(1);
      if (milestones.length === 0) throw new NotFoundException('里程碑不存在');
      const m = milestones[0];
      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${taskSubTask.sortOrder}), -1)` })
        .from(taskSubTask).where(eq(taskSubTask.milestoneId, dto.milestoneId));
      const [sRow] = await tx.insert(taskSubTask).values({
        milestoneId: dto.milestoneId, groupId: m.groupId, title: dto.title,
        description: dto.description ?? '', sortOrder: dto.sortOrder ?? max + 1,
        estimatedMinutes: dto.estimatedMinutes ?? 60,
      }).returning();
      await tx.update(taskMilestone).set({
        totalSubTasks: sql<number>`${taskMilestone.totalSubTasks} + 1`,
      }).where(eq(taskMilestone.id, dto.milestoneId));
      await this.recalcMilestone(tx, dto.milestoneId);
      await tx.update(taskGroup).set({
        totalSubTasks: sql<number>`${taskGroup.totalSubTasks} + 1`,
      }).where(eq(taskGroup.id, m.groupId));
      await this.recalcGroup(tx, m.groupId);
      return sRow;
    });
    return this.ss(result);
  }

  async updateSubTask(id: string, dto: UpdateSubTaskDto): Promise<TaskSubTask> {
    const existingRows = await this.db.select().from(taskSubTask)
      .where(eq(taskSubTask.id, id)).limit(1);
    if (existingRows.length === 0) throw new NotFoundException('子任务不存在');
    const existing = existingRows[0];

    const patch: Partial<SubTaskInsert> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.estimatedMinutes !== undefined) patch.estimatedMinutes = dto.estimatedMinutes;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;

    const completedChanged = dto.isCompleted !== undefined && dto.isCompleted !== existing.isCompleted;
    if (completedChanged) {
      patch.isCompleted = dto.isCompleted;
      patch.completedAt = dto.isCompleted ? new Date() : null;
    }

    if (!completedChanged) {
      const [updated] = await this.db.update(taskSubTask).set(patch)
        .where(eq(taskSubTask.id, id)).returning();
      return this.ss(updated);
    }

    const result = await this.db.transaction(async (tx) => {
      const [updated] = await tx.update(taskSubTask).set(patch)
        .where(eq(taskSubTask.id, id)).returning();
      const delta = dto.isCompleted ? 1 : -1;
      await tx.update(taskMilestone).set({
        completedSubTasks: sql<number>`${taskMilestone.completedSubTasks} + ${delta}`,
      }).where(eq(taskMilestone.id, existing.milestoneId));
      await this.recalcMilestone(tx, existing.milestoneId);
      await tx.update(taskGroup).set({
        completedSubTasks: sql<number>`${taskGroup.completedSubTasks} + ${delta}`,
      }).where(eq(taskGroup.id, existing.groupId));
      await this.recalcGroup(tx, existing.groupId);
      return updated;
    });
    return this.ss(result);
  }

  async deleteSubTask(id: string): Promise<{ id: string }> {
    const result = await this.db.transaction(async (tx) => {
      const subTasks = await tx.select().from(taskSubTask)
        .where(eq(taskSubTask.id, id)).limit(1);
      if (subTasks.length === 0) return null;
      const st = subTasks[0];
      await tx.delete(taskSubTask).where(eq(taskSubTask.id, id));
      await tx.update(taskMilestone).set({
        totalSubTasks: sql<number>`${taskMilestone.totalSubTasks} - 1`,
        completedSubTasks: st.isCompleted
          ? sql<number>`${taskMilestone.completedSubTasks} - 1`
          : taskMilestone.completedSubTasks,
      }).where(eq(taskMilestone.id, st.milestoneId));
      await this.recalcMilestone(tx, st.milestoneId);
      await tx.update(taskGroup).set({
        totalSubTasks: sql<number>`${taskGroup.totalSubTasks} - 1`,
        completedSubTasks: st.isCompleted
          ? sql<number>`${taskGroup.completedSubTasks} - 1`
          : taskGroup.completedSubTasks,
      }).where(eq(taskGroup.id, st.groupId));
      await this.recalcGroup(tx, st.groupId);
      return { id };
    });
    if (!result) throw new NotFoundException('子任务不存在');
    return { id: result.id };
  }

  async reorderSubTasks(dto: ReorderSubTasksDto): Promise<{ success: true }> {
    await this.db.transaction(async (tx) => {
      for (const item of dto.orders) {
        await tx.update(taskSubTask).set({ sortOrder: item.sortOrder })
          .where(eq(taskSubTask.id, item.id));
      }
    });
    return { success: true };
  }

  async splitTask(dto: CreateTaskSplitDto): Promise<TaskSplitPreview> {
    const input: IntelligentTaskSplitterOneInput = {
      task_name: dto.title,
      task_description: dto.description ?? '',
    };
    const result = await this.capabilityService
      .load('intelligent_task_splitter_1')
      .call('textToJson', input) as { milestones: Array<{
        name: string; description: string;
        subTasks: Array<{ name: string; description: string; estimatedMinutes: number }>;
      }> };

    const preview: TaskSplitPreview = {
      milestones: (result.milestones ?? []).map((m) => ({
        name: m.name ?? '',
        description: m.description ?? '',
        skillNames: [],
        subTasks: (m.subTasks ?? []).map((s) => ({
          name: s.name ?? '',
          description: s.description ?? '',
          estimatedMinutes: Number(s.estimatedMinutes) || 60,
          skillNames: [],
        })),
      })),
    };
    return preview;
  }

  async createFromSplit(dto: CreateTaskGroupDto): Promise<TaskGroup> {
    return this.createGroup(dto);
  }

  async getOverviewStats(): Promise<TaskOverviewStats> {
    const rows = await this.db.select({
      status: taskGroup.status,
      totalSubTasks: taskGroup.totalSubTasks,
      completedSubTasks: taskGroup.completedSubTasks,
    }).from(taskGroup);

    let totalGroups = 0, activeGroups = 0, completedGroups = 0;
    let totalSubTasks = 0, completedSubTasks = 0;
    for (const g of rows) {
      totalGroups++;
      if (g.status === 'completed') completedGroups++;
      else if (g.status === 'in_progress') activeGroups++;
      totalSubTasks += g.totalSubTasks;
      completedSubTasks += g.completedSubTasks;
    }
    return {
      totalGroups, activeGroups, completedGroups,
      totalSubTasks, completedSubTasks,
      overallProgress: calcProgress(completedSubTasks, totalSubTasks),
    };
  }
}
