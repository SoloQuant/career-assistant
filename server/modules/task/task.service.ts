import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc } from 'drizzle-orm';
import { task } from '@server/database/schema';
import type { Task, CreateTaskDto, UpdateTaskDto } from '@shared/api.interface';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private toTask(row: typeof task.$inferSelect): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      relatedSkills: row.relatedSkills ?? [],
      estimatedTime: row.estimatedTime,
      priority: row.priority as Task['priority'],
      status: row.status as Task['status'],
      taskType: row.taskType as Task['taskType'],
      dueDate: row.dueDate ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<Task[]> {
    try {
      const rows = await this.db
        .select()
        .from(task)
        .orderBy(desc(task.createdAt));
      return rows.map((row) => this.toTask(row));
    } catch (error) {
      this.logger.error('获取任务列表失败', error as Error);
      throw error;
    }
  }

  async findById(id: string): Promise<Task | null> {
    try {
      const rows = await this.db
        .select()
        .from(task)
        .where(eq(task.id, id))
        .limit(1);
      if (rows.length === 0) return null;
      return this.toTask(rows[0]);
    } catch (error) {
      this.logger.error(`获取任务详情失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    try {
      const inserted = await this.db
        .insert(task)
        .values({
          title: dto.title,
          description: dto.description ?? '',
          relatedSkills: dto.relatedSkills ?? [],
          estimatedTime: dto.estimatedTime ?? 0,
          priority: dto.priority ?? 'medium',
          taskType: dto.taskType ?? 'learning',
          dueDate: dto.dueDate ?? null,
        })
        .returning();
      return this.toTask(inserted[0]);
    } catch (error) {
      this.logger.error('创建任务失败', error as Error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    try {
      const patch: Partial<typeof task.$inferInsert> = {};
      if (dto.title !== undefined) patch.title = dto.title;
      if (dto.description !== undefined) patch.description = dto.description;
      if (dto.relatedSkills !== undefined) patch.relatedSkills = dto.relatedSkills;
      if (dto.estimatedTime !== undefined) patch.estimatedTime = dto.estimatedTime;
      if (dto.priority !== undefined) patch.priority = dto.priority;
      if (dto.status !== undefined) patch.status = dto.status;
      if (dto.taskType !== undefined) patch.taskType = dto.taskType;
      if (dto.dueDate !== undefined) patch.dueDate = dto.dueDate ?? null;

      const updated = await this.db
        .update(task)
        .set(patch)
        .where(eq(task.id, id))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundException('任务不存在');
      }
      return this.toTask(updated[0]);
    } catch (error) {
      this.logger.error(`更新任务失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async remove(id: string): Promise<{ id: string }> {
    try {
      const deleted = await this.db
        .delete(task)
        .where(eq(task.id, id))
        .returning({ id: task.id });
      if (deleted.length === 0) {
        throw new NotFoundException('任务不存在');
      }
      return { id: deleted[0].id };
    } catch (error) {
      this.logger.error(`删除任务失败 id=${id}`, error as Error);
      throw error;
    }
  }
}
